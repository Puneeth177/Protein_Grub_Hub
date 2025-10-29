const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripeService = require('../services/stripe.service');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');

/**
 * POST /api/payments/create-intent
 * Create a Stripe PaymentIntent for an order
 */
router.post('/create-intent', auth, async (req, res) => {
    try {
        const { orderId, amount, currency, paymentMethod } = req.body;
        const userId = req.user.userId;

        // Validate amount
        const minAmount = parseInt(process.env.MIN_ORDER_AMOUNT) || 50;
        const maxAmount = parseInt(process.env.MAX_ORDER_AMOUNT) || 5000;

        if (amount < minAmount || amount > maxAmount) {
            return res.status(400).json({
                message: `Amount must be between ₹${minAmount} and ₹${maxAmount}`
            });
        }

        // Check if order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order belongs to user
        if (order.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if payment already exists for this order
        const existingPayment = await Payment.findOne({ orderId });
        if (existingPayment && existingPayment.status === 'succeeded') {
            return res.status(400).json({ message: 'Order already paid' });
        }

        // Create Stripe PaymentIntent
        const paymentIntent = await stripeService.createPaymentIntent({
            amount,
            currency: currency || process.env.DEFAULT_CURRENCY || 'INR',
            orderId,
            userId,
            paymentMethod: paymentMethod || 'card'
        });

        // Save payment record
        const payment = new Payment({
            orderId,
            userId,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            currency: currency || 'INR',
            status: paymentIntent.status,
            paymentMethod: paymentMethod || 'card',
            clientSecret: paymentIntent.client_secret,
            metadata: {
                merchantName: process.env.MERCHANT_NAME,
                merchantUpiId: process.env.MERCHANT_UPI_ID
            }
        });

        await payment.save();

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: payment.amount,
            currency: payment.currency
        });

    } catch (error) {
        console.error('Create Payment Intent Error:', error);
        res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
    }
});

/**
 * GET /api/payments/:paymentId
 * Get payment details
 */
router.get('/:paymentId', auth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Check if payment belongs to user
        if (payment.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json(payment);
    } catch (error) {
        console.error('Get Payment Error:', error);
        res.status(500).json({ message: 'Failed to retrieve payment' });
    }
});

/**
 * POST /api/payments/refund
 * Request a refund for a payment
 */
router.post('/refund', auth, async (req, res) => {
    try {
        const { paymentId, reason } = req.body;

        const payment = await Payment.findById(paymentId);
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Check if payment belongs to user
        if (payment.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if payment is eligible for refund
        if (payment.status !== 'succeeded') {
            return res.status(400).json({ message: 'Only successful payments can be refunded' });
        }

        // Create refund
        const refund = await stripeService.createRefund(
            payment.stripePaymentIntentId,
            payment.amount,
            reason || 'requested_by_customer'
        );

        // Update payment status
        payment.status = 'refunded';
        await payment.save();

        res.json({
            message: 'Refund initiated successfully',
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            }
        });

    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
});

module.exports = router;
