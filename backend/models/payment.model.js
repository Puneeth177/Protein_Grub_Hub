const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stripePaymentIntentId: {
        type: String
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: [
            'pending',
            'processing',
            'succeeded',
            'failed',
            'canceled',
            'requires_action',
            'requires_payment_method',
            'requires_confirmation',
            'requires_capture',
            'refunded'
        ],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'upi', 'netbanking']
    },
    clientSecret: { type: String },
    // Razorpay fields
    razorpay_order_id: { type: String, index: true },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },
    metadata: {
        type: Map,
        of: String
    },
    errorMessage: String
}, { timestamps: true });

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
// Keep a normal (non-unique) index so lookups remain fast
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ razorpay_order_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
