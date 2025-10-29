const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'dislike'], required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    // Optional product context; allow site-wide via null or a fixed id like 'home_testimonials'
    productId: { type: mongoose.Schema.Types.Mixed, default: null },

    // Author snapshot at the time of posting
    author: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      avatarUrl: { type: String }
    },

    // Top-level userId kept for backward compatibility and fast lookups
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, maxlength: 1000 },

    // Reactions and derived counts
    reactions: { type: [reactionSchema], default: [] },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },

    status: { type: String, enum: ['published', 'hidden', 'deleted'], default: 'published' }
  },
  { timestamps: true }
);

// Indexes
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, rating: -1 });
reviewSchema.index({ 'reactions.userId': 1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);