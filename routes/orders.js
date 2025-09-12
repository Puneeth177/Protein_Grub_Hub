const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const auth = require('../middleware/auth');

// Get all orders for a user
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .sort({ created: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            message: 'Failed to fetch orders',
            error: error.message 
        });
    }
});

// Get specific order
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ 
            _id: req.params.id,
            userId: req.user.userId
        });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ 
            message: 'Failed to fetch order',
            error: error.message 
        });
    }
});

// Create new order from cart items
router.post('/', auth, async (req, res) => {
    try {
        const { items, subtotal, tax, deliveryFee, total } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        // Create new order
        const order = new Order({
            userId: req.user.userId,
            items,
            subtotal,
            tax,
            deliveryFee,
            total,
            status: 'pending',
            delivery: req.body.deliveryAddress,
            payment: {
                method: req.body.paymentMethod,
                status: 'pending'
            }
        });

        try {
            await order.save();
            
            // Find and clear user's cart
            const cart = await Cart.findOne({ userId: req.user.userId });
            if (cart) {
                cart.items = [];
                cart.total = 0;
                await cart.save();
            }
            
            res.status(201).json({
                message: 'Order created successfully',
                order: order
            });
        } catch (error) {
            console.error('Error saving order:', error);
            res.status(500).json({ 
                message: 'Failed to create order',
                error: error.message 
            });
        }

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order status (admin only)
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;