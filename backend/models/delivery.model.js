const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    status: { type: String, enum: ['pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'], default: 'pending' },
    pickupLocation: { address: String, lat: Number, lng: Number },
    deliveryLocation: { address: String, lat: Number, lng: Number },
    estimatedTime: { type: Number, default: 30 },
    actualTime: Number,
    distance: Number,
    timeline: [{ status: String, timestamp: { type: Date, default: Date.now }, location: { lat: Number, lng: Number }, note: String }],
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String
}, { timestamps: true });

deliverySchema.index({ orderId: 1 });
deliverySchema.index({ partnerId: 1 });
deliverySchema.index({ status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);