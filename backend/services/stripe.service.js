const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
    /**
     * Create a Stripe PaymentIntent
     */
    async createPaymentIntent({ amount, currency = 'INR', orderId, userId, paymentMethod = 'card' }) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
                currency: currency.toLowerCase(),
                payment_method_types: paymentMethod === 'upi' ? ['card', 'upi'] : ['card'],
                metadata: {
                    orderId: orderId.toString(),
                    userId: userId.toString(),
                    merchantName: process.env.MERCHANT_NAME || 'Protein Grub Hub',
                    merchantUpiId: process.env.MERCHANT_UPI_ID || ''
                },
                description: `Order #${orderId} - Protein Grub Hub`
            });

            return paymentIntent;
        } catch (error) {
            console.error('Stripe Payment Intent Creation Error:', error);
            throw new Error(`Payment intent creation failed: ${error.message}`);
        }
    }

    /**
     * Confirm a PaymentIntent
     */
    async confirmPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Stripe Payment Confirm Error:', error);
            throw error;
        }
    }

    /**
     * Retrieve a PaymentIntent
     */
    async retrievePaymentIntent(paymentIntentId) {
        try {
            return await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            console.error('Stripe Retrieve Error:', error);
            throw error;
        }
    }

    /**
     * Create a refund
     */
    async createRefund(paymentIntentId, amount, reason = 'requested_by_customer') {
        try {
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount ? Math.round(amount * 100) : undefined,
                reason: reason
            });
            return refund;
        } catch (error) {
            console.error('Stripe Refund Error:', error);
            throw error;
        }
    }

    /**
     * Construct webhook event from payload and signature
     */
    constructWebhookEvent(payload, signature) {
        try {
            return stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            throw error;
        }
    }
}

module.exports = new StripeService();
