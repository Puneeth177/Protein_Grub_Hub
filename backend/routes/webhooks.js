const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe.service');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const paymentEmailService = require('../services/payment-email.service');
const User = require('../models/user.model');

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * IMPORTANT: This endpoint needs raw body, not JSON parsed
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        // Construct event from webhook payload and signature
        const event = stripeService.constructWebhookEvent(req.body, sig);

        console.log(`Webhook received: ${event.type}`);

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            case 'payment_intent.canceled':
                await handlePaymentCanceled(event.data.object);
                break;

            case 'payment_intent.requires_action':
                await handlePaymentRequiresAction(event.data.object);
                break;

            case 'charge.refunded':
                await handleRefund(event.data.object);
                break;

            case 'charge.dispute.created':
                await handleDispute(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return 200 to acknowledge receipt
        res.json({ received: true });

    } catch (error) {
        console.error('Webhook Error:', error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent) {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
        
        if (!payment) {
            console.error('Payment not found for PaymentIntent:', paymentIntent.id);
            return;
        }

        payment.status = 'succeeded';
        await payment.save();

        const order = await Order.findById(payment.orderId);
        const user = await User.findById(payment.userId);
        
        if (order && user) {
            // Mark order completed immediately after successful payment
            order.status = 'completed';
            if (order.payment) {
                order.payment.status = 'completed';
            }
            await order.save();

            // Send confirmation email
            await paymentEmailService.sendPaymentSuccessEmail(user, order, payment);
            
            console.log(`Order ${order._id} marked as completed after payment success`);
        }

    } catch (error) {
        console.error('Error handling payment success:', error);
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
        
        if (!payment) {
            console.error('Payment not found for PaymentIntent:', paymentIntent.id);
            return;
        }

        // Update payment status
        payment.status = 'failed';
        payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
        await payment.save();

        // Update order status
        const order = await Order.findById(payment.orderId);
        if (order) {
            order.status = 'cancelled';
            if (order.payment) {
                order.payment.status = 'failed';
            }
            await order.save();

            console.log(`Order ${order._id} marked as cancelled due to payment failure`);

            // TODO: Send failure notification email
            // TODO: Implement retry logic
        }

    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent) {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
        
        if (!payment) return;

        payment.status = 'canceled';
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
            order.status = 'cancelled';
            await order.save();
        }

        console.log(`Payment ${payment._id} canceled`);

    } catch (error) {
        console.error('Error handling payment cancellation:', error);
    }
}

/**
 * Handle payment requiring action (3DS, etc.)
 */
async function handlePaymentRequiresAction(paymentIntent) {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
        
        if (!payment) return;

        payment.status = 'requires_action';
        await payment.save();

        console.log(`Payment ${payment._id} requires action`);

    } catch (error) {
        console.error('Error handling payment requires action:', error);
    }
}

/**
 * Handle refund
 */
async function handleRefund(charge) {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: charge.payment_intent });
        
        if (!payment) return;

        payment.status = 'refunded';
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
            order.status = 'cancelled';
            await order.save();
        }

        console.log(`Payment ${payment._id} refunded`);

        // TODO: Send refund confirmation email

    } catch (error) {
        console.error('Error handling refund:', error);
    }
}

/**
 * Handle dispute
 */
async function handleDispute(dispute) {
    try {
        console.log('Dispute created:', dispute.id);
        
        // TODO: Log dispute for manual review
        // TODO: Send alert to admin
        // TODO: Gather evidence if needed

    } catch (error) {
        console.error('Error handling dispute:', error);
    }
}

module.exports = router;
