const express = require('express');
const router = express.Router();
const Cart = require('../models/cart.model');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ 
                userId: req.user.userId, 
                items: [], 
                subtotal: 0 
            });
            await cart.save();
        }
        
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update entire cart
router.post('/', auth, async (req, res) => {
    try {
        const { items } = req.body;
        let cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ userId: req.user.userId });
        }

        // Update cart items
        cart.items = items;
        
        // Calculate subtotal
        cart.subtotal = items.reduce((total, item) => 
            total + (item.meal.price * item.quantity), 0);
        
        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update cart item quantity
router.put('/update/:productId', auth, async (req, res) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ userId: req.user.id });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === req.params.productId);
        
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
            await cart.save();
            res.json(cart);
        } else {
            res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = [];
        cart.subtotal = 0;
        cart.protein = 0;
        await cart.save();
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;