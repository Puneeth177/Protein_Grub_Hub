const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: Number, unique: true, sparse: true },
    items: [{
        meal: {
            _id: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            protein_grams: { type: Number, required: true },
            calories: { type: Number, required: true },
            image_url: { type: String }
        },
        quantity: { type: Number, required: true },
        customizations: [{ type: String }]
    }],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'processing', 'completed', 'cancelled', 'out-for-delivery', 'delivered'] },
    delivery: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip_code: { type: String, required: true },
        phone: { type: String, required: true },
        delivery_instructions: { type: String }
    },
    payment: {
        method: { type: String, required: true, enum: ['card', 'cash'] },
        status: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'failed', 'out-for-delivery', 'delivered'] }
    },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
});

// Pre-save hook to auto-increment orderNumber
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        try {
            // Find the highest order number
            const lastOrder = await mongoose.model('Order').findOne({}, { orderNumber: 1 })
                .sort({ orderNumber: -1 })
                .limit(1);
            
            // Set order number to last + 1, or 1 if no orders exist
            this.orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);