const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/review.model');
const auth = require('../middleware/auth');

// Simple per-user rate limit (in-memory) for creating reviews
const postRateLimit = (() => {
  const windowMs = 60 * 1000; // 1 minute
  const max = 5; // max 5 posts per minute
  const buckets = new Map(); // userId -> { count, reset }
  return (req, res, next) => {
    const key = (req.user && (req.user.userId || req.user.id)) || req.ip;
    const now = Date.now();
    const entry = buckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    buckets.set(key, entry);
    if (entry.count > max) {
      return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
})();

function parseListQuery(req) {
  const productId = req.query.productId || null;
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
  const sortParam = (req.query.sort || 'latest').toString();
  return { productId, limit, skip, sortParam };
}

function buildSort(sortParam) {
  if (sortParam === 'top') {
    // We will sort by computed field later in aggregation
    return null;
  }
  if (sortParam === 'rating') {
    return { rating: -1, createdAt: -1 };
  }
  return { createdAt: -1 };
}

// List reviews with aggregates (defensive)
router.get('/', async (req, res) => {
  try {
    const { productId, limit, skip, sortParam } = parseListQuery(req);

    const match = { status: { $ne: 'deleted' } };
    if (productId) match.productId = productId;

    // Build sort
    let sort = { createdAt: -1 };
    if (sortParam === 'rating') sort = { rating: -1, createdAt: -1 };

    // Fetch page
    let [reviews, total] = await Promise.all([
      Review.find(match).sort(sort).skip(skip).limit(limit).lean(),
      Review.countDocuments(match)
    ]);

    // Best-effort: enrich author snapshot so UI shows real username/avatar
    try {
      const ids = Array.from(new Set(
        reviews
          .map(r => (r.author?.userId || r.userId))
          .filter(Boolean)
          .map(id => id.toString())
      ));
      if (ids.length) {
        const User = require('../models/user.model');
        const users = await User.find({ _id: { $in: ids } }).select('name avatar').lean();
        const uMap = new Map(users.map(u => [u._id.toString(), u]));
        reviews = reviews.map(r => {
          const uid = (r.author?.userId || r.userId)?.toString();
          const u = uid ? uMap.get(uid) : null;
          if (u) {
            r.author = r.author || {};
            // Prefer stored author.name unless it's missing or generic
            if (!r.author.name || r.author.name === 'User') {
              r.author.name = u.name || r.author.name;
            }
            const avatarUrl = u.avatar && u.avatar.url ? u.avatar.url : undefined;
            if (avatarUrl && !r.author.avatarUrl) {
              r.author.avatarUrl = avatarUrl;
            }
          }
          return r;
        });
      }
    } catch (enrichErr) {
      console.warn('Author enrich skipped:', enrichErr?.message || enrichErr);
    }

    // Defaults
    let ratingCounts = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    let averageRating = 0;

    // Try aggregates, but do not fail the request if they error
    try {
      const buckets = await Review.aggregate([
        { $match: match },
        { $group: { _id: '$rating', count: { $sum: 1 } } }
      ]);
      buckets.forEach(b => { if (ratingCounts[b._id] != null) ratingCounts[b._id] = b.count; });

      const avgDoc = await Review.aggregate([
        { $match: match },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]);
      averageRating = Number((avgDoc[0]?.avg || 0).toFixed(1));
    } catch (aggErr) {
      console.error('Aggregate error (non-fatal):', aggErr);
    }

    // If sort=top, do a simple in-memory net-sort for this page
    if (sortParam === 'top') {
      reviews.sort((a, b) => {
        const na = (a.likes || 0) - (a.dislikes || 0);
        const nb = (b.likes || 0) - (b.dislikes || 0);
        if (nb !== na) return nb - na;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.json({ reviews, total, averageRating, ratingCounts });
  } catch (err) {
    console.error('List reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create review
router.post('/', auth, postRateLimit, async (req, res) => {
  try {
    const { productId = null, rating, text } = req.body;
    const r = parseInt(rating, 10);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    if (text && text.length > 1000) {
      return res.status(400).json({ message: 'Text exceeds 1000 characters' });
    }

    // Load user to snapshot name and avatar
    const User = require('../models/user.model');
    const userDoc = await User.findById(req.user.userId).select('name avatar');
    const authorName = userDoc?.name || 'User';
    const authorAvatar = userDoc?.avatar?.url || undefined;

    const review = await Review.create({
      productId,
      author: {
        userId: req.user.userId,
        name: authorName,
        avatarUrl: authorAvatar
      },
      userId: req.user.userId, // legacy compat
      rating: r,
      text: text || '',
      likes: 0,
      dislikes: 0,
      reactions: [],
      status: 'published'
    });

    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update review (owner or admin)
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, text } = req.body;

    const review = await Review.findById(reviewId);
    if (!review || review.status === 'deleted') {
      return res.status(404).json({ message: 'Review not found' });
    }

    const tokenUserId = String(req.user.userId || req.user.id);
    const authorId = review.author?.userId ? String(review.author.userId) : null;
    const legacyUserId = review.userId ? String(review.userId) : null;
    const isOwner = (authorId && authorId === tokenUserId) || (legacyUserId && legacyUserId === tokenUserId);
    const isAdmin = !!req.user.isAdmin;
    console.log('PUT /api/reviews debug', {
        reviewId,
        tokenUserId: String(req.user.userId || req.user.id),
        authorId: review.author?.userId ? String(review.author.userId) : null,
        legacyUserId: review.userId ? String(review.userId) : null,
    });
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (rating !== undefined) {
      const r = parseInt(rating, 10);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ message: 'Rating must be integer 1..5' });
      }
      review.rating = r;
    }
    if (text !== undefined) {
      if (text && text.length > 1000) {
        return res.status(400).json({ message: 'Text exceeds 1000 characters' });
      }
      review.text = text;
    }

    await review.save();
    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete review (soft delete)
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const tokenUserId = String(req.user.userId || req.user.id);
    const authorId = review.author?.userId ? String(review.author.userId) : null;
    const legacyUserId = review.userId ? String(review.userId) : null;

    console.log('DELETE /api/reviews raw review doc', {
        _id: String(review._id),
        author: review.author,
        userId: review.userId,               // legacy field
        likes: review.likes,
        dislikes: review.dislikes,
        status: review.status,
    });
    // TEMP DEBUG LOGS
    console.log('DELETE /api/reviews debug', {
        reviewId,
        tokenUserId,
        authorId,
        legacyUserId,
        userPayload: req.user,            // what auth middleware decoded
        hasAuthor: !!review.author,
        hasLegacyUserId: !!review.userId,
    });
    const isOwner = (authorId && authorId === tokenUserId) || (legacyUserId && legacyUserId === tokenUserId);
    const isAdmin = !!req.user.isAdmin;
    if (!isOwner && !isAdmin) {
        console.log('DELETE /api/reviews denied', { isOwner, isAdmin });
        return res.status(403).json({ message: 'Forbidden' });
    }

    review.status = 'deleted';
    await review.save();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single review
router.get('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review || review.status === 'deleted') {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Atomic reaction toggle
router.post('/:reviewId/react', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { type } = req.body; // 'like' | 'dislike'
    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const userId = new mongoose.Types.ObjectId(String(req.user.userId || req.user.id));
    const now = new Date();

    // Use update pipeline to toggle atomically
    const updated = await Review.findOneAndUpdate(
      { _id: reviewId, status: { $ne: 'deleted' } },
      [
        {
          $set: {
            reactions: {
              $let: {
                vars: {
                  existing: {
                    $first: {
                      $filter: {
                        input: '$reactions',
                        as: 'r',
                        cond: { $eq: ['$$r.userId', userId] }
                      }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $eq: ['$$existing.type', type] },
                    // same reaction exists -> remove
                    {
                      $filter: {
                        input: '$reactions',
                        as: 'r',
                        cond: { $ne: ['$$r.userId', userId] }
                      }
                    },
                    // otherwise replace or add
                    {
                      $concatArrays: [
                        {
                          $filter: {
                            input: '$reactions',
                            as: 'r',
                            cond: { $ne: ['$$r.userId', userId] }
                          }
                        },
                        [{ userId, type, createdAt: now }]
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $set: {
            likes: {
              $size: {
                $filter: { input: '$reactions', as: 'r', cond: { $eq: ['$$r.type', 'like'] } }
              }
            },
            dislikes: {
              $size: {
                $filter: { input: '$reactions', as: 'r', cond: { $eq: ['$$r.type', 'dislike'] } }
              }
            }
          }
        }
      ],
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Review not found' });

    const userReaction = updated.reactions.find(r => r.userId.toString() === req.user.id)?.type || null;
    res.json({ likes: updated.likes, dislikes: updated.dislikes, userReaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;