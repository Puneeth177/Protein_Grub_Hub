const express = require('express');
const router = express.Router();
const Review = require('../models/review.model');
const auth = require('../middleware/auth');

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId })
            .populate('userId', 'email')
            .sort({ created: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's reviews
router.get('/user', auth, async (req, res) => {
    try {
        const reviews = await Review.find({ userId: req.user.id })
            .populate('productId')
            .sort({ created: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new review
router.post('/', auth, async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        
        // Check if user already reviewed this product
        const existingReview = await Review.findOne({
            userId: req.user.id,
            productId
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        const review = new Review({
            userId: req.user.id,
            productId,
            rating,
            comment
        });

        await review.save();
        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update review
router.put('/:id', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const review = await Review.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.rating = rating;
        review.comment = comment;
        await review.save();
        
        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete review
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;