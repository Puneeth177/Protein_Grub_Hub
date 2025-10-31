const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripeService = require('../services/stripe.service');
const razorpayService = require('../services/razorpay.service');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');

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
 * POST /api/payments/razorpay/verify
 * Verify Razorpay payment signature and mark order completed (fallback when webhook not reachable)
 */
router.post('/razorpay/verify', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing Razorpay verification parameters' });
        }

        const ok = razorpayService.verifyPaymentSignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });
        if (!ok) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Update payment and order
        const payment = await Payment.findOne({ razorpay_order_id });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        // Ensure the caller owns this payment
        if (String(payment.userId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        payment.razorpay_payment_id = razorpay_payment_id;
        payment.razorpay_signature = razorpay_signature;
        payment.status = 'succeeded';
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
            order.status = 'completed';
            if (order.payment) order.payment.status = 'completed';
            await order.save();
            // Clear user's cart after successful payment (server-authoritative)
            try {
                await Cart.updateOne({ userId: payment.userId }, { $set: { items: [], subtotal: 0, total: 0 } });
            } catch (e) {
                console.warn('Cart clear after Razorpay verify failed (non-fatal):', e.message);
            }
        }

        return res.json({ message: 'Payment verified and order completed' });
    } catch (error) {
        console.error('Razorpay verify error:', error);
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
});

/**
 * POST /api/payments/razorpay/create-order
 * Create a Razorpay Order for an existing order
 */
router.post('/razorpay/create-order', auth, async (req, res) => {
    try {
        const { orderId, amount: rawAmount, currency } = req.body;
        const userId = req.user.userId;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ message: 'Unauthorized' });

        // Ensure Razorpay keys exist
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                message: 'Failed to create Razorpay order',
                error: 'Razorpay keys are not configured on the server.'
            });
        }

        // Use amount from body or order total; coerce to number in rupees
        let amount = Number(rawAmount ?? order.total ?? order.totalAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount for Razorpay order' });
        }

        // Create Razorpay order (amount in paise)
        const rzpOrder = await razorpayService.createOrder({
            amount,
            currency: currency || 'INR',
            receipt: orderId.toString(),
            notes: { appOrderId: orderId.toString(), userId }
        });

        // Upsert payment document
        let payment = await Payment.findOne({ orderId });
        if (!payment) {
            payment = new Payment({
                orderId,
                userId,
                amount,
                currency: currency || 'INR',
                status: 'pending',
                paymentMethod: 'card',
                razorpay_order_id: rzpOrder.id
            });
        } else {
            payment.razorpay_order_id = rzpOrder.id;
            payment.amount = amount;
            payment.currency = currency || 'INR';
            payment.status = 'pending';
        }
        await payment.save();

        res.json({
            rzpOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Create Razorpay Order Error:', error);
        res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
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
