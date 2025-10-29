const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: String,
    currentLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    },
    status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    totalDeliveries: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

deliveryPartnerSchema.index({ status: 1 });
deliveryPartnerSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);