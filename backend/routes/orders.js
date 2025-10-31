const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const { sendMail } = require('../services/email/emailService');
const templates = require('../services/email/templates');
const Product = require('../models/product.model');
const Reservation = require('../models/reservation.model');

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

            // Build the required decrements from request items
            const decrements = (items || []).map(i => ({
            productId: i?.meal?._id,
            qty: i?.quantity || 0,
            })).filter(x => x.productId && x.qty > 0);

            // Validate input
            if (decrements.length === 0) {
            return res.status(400).json({ message: 'No valid items to order' });
            }

            // Try to decrement inventory atomically per product with guard inventory >= qty
            for (const d of decrements) {
            const result = await Product.updateOne(
                { _id: d.productId, inventory: { $gte: d.qty } },
                { $inc: { inventory: -d.qty } }
            );
            if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
                // If any product lacks sufficient stock, roll back previous decrements
                // Rollback best effort
                for (const r of decrements) {
                // Add back only if we have already decremented this one
                if (String(r.productId) === String(d.productId)) break;
                await Product.updateOne({ _id: r.productId }, { $inc: { inventory: r.qty } });
                }
                return res.status(409).json({ message: 'Insufficient stock for one or more items' });
            }
            }

            await order.save();
            await Reservation.deleteOne({ userId: req.user.userId }).catch(() => {});
            // For Cash on Delivery, consider the order placed and clear cart immediately
            try {
                if ((req.body?.paymentMethod || '').toLowerCase() === 'cash') {
                    const cart = await Cart.findOne({ userId: req.user.userId });
                    if (cart) {
                        cart.items = [];
                        cart.subtotal = 0;
                        cart.total = 0;
                        await cart.save();
                    }
                }
            } catch (e) {
                console.warn('COD cart clear failed (non-fatal):', e.message);
            }

            try {
                // Intentionally not sending order confirmation email here.
                // Confirmation is sent after successful payment via Stripe webhook.
            } catch (e) {
                console.error('Order email flow error:', e.message);
            }
            
            return res.status(201).json({
                message: 'Order created successfully',
                order: order
            });
        } catch (error) {
            console.error('Error saving order:', error);
            return res.status(500).json({ 
                message: 'Failed to create order',
                error: error.message 
            });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
});

const requireAdmin = require('../middleware/requireAdmin');

// Update order status (admin only)
router.put('/:id/status', auth, requireAdmin, async (req, res) => {
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