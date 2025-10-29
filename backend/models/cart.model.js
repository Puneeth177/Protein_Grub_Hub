const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        meal: {
            _id: { type: String, required: true },
            name: { type: String, required: true },
            description: { type: String },
            protein_grams: { type: Number },
            calories: { type: Number },
            price: { type: Number, required: true },
            image_url: { type: String }
        },
        quantity: { type: Number, required: true, default: 1 },
        customizations: [{ type: String }]
    }],
    subtotal: { type: Number, default: 0 },
    updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);