const Delivery = require('../models/delivery.model');
const DeliveryPartner = require('../models/delivery-partner.model');
const Order = require('../models/order.model');
const etaCalculator = require('./eta-calculator.service');

class DeliveryTrackingService {
    async createDelivery(orderId, deliveryAddress) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        const restaurantLocation = { address: 'Protein Grub Hub Kitchen, Bangalore', lat: 12.9716, lng: 77.5946 };
        const delivery = new Delivery({
            orderId, status: 'pending', pickupLocation: restaurantLocation, deliveryLocation: deliveryAddress,
            timeline: [{ status: 'pending', timestamp: new Date(), note: 'Order placed, waiting for delivery partner' }]
        });
        await delivery.save();
        return delivery;
    }

    async assignPartner(deliveryId) {
        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) throw new Error('Delivery not found');

        const partner = await DeliveryPartner.findOne({ status: 'available', isActive: true });
        if (!partner) throw new Error('No delivery partners available');

        const etaData = etaCalculator.calculateETA(delivery.pickupLocation, delivery.deliveryLocation, partner.vehicleType);
        delivery.partnerId = partner._id;
        delivery.status = 'assigned';
        delivery.assignedAt = new Date();
        delivery.estimatedTime = etaData.eta;
        delivery.distance = etaData.distance;
        delivery.timeline.push({ status: 'assigned', timestamp: new Date(), note: `Assigned to ${partner.name}` });
        await delivery.save();

        partner.status = 'busy';
        await partner.save();

        return { delivery, partner, eta: etaData };
    }

    async updateDeliveryStatus(deliveryId, status, location = null, note = '') {
        const delivery = await Delivery.findById(deliveryId).populate('partnerId');
        if (!delivery) throw new Error('Delivery not found');

        delivery.status = status;
        if (status === 'picked_up') delivery.pickedUpAt = new Date();
        else if (status === 'delivered') {
            delivery.deliveredAt = new Date();
            if (delivery.assignedAt) delivery.actualTime = Math.ceil((delivery.deliveredAt - delivery.assignedAt) / 60000);
            if (delivery.partnerId) await DeliveryPartner.findByIdAndUpdate(delivery.partnerId._id, { status: 'available', $inc: { totalDeliveries: 1 } });
        } else if (status === 'cancelled') {
            delivery.cancelledAt = new Date();
            if (delivery.partnerId) await DeliveryPartner.findByIdAndUpdate(delivery.partnerId._id, { status: 'available' });
        }

        delivery.timeline.push({ status, timestamp: new Date(), location: location || undefined, note: note || `Status updated to ${status}` });
        await delivery.save();
        return delivery;
    }

    async updatePartnerLocation(partnerId, location) {
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) throw new Error('Partner not found');

        partner.currentLocation = { lat: location.lat, lng: location.lng, lastUpdated: new Date() };
        await partner.save();

        const delivery = await Delivery.findOne({ partnerId, status: { $in: ['assigned', 'picked_up', 'on_the_way'] } });
        if (delivery) {
            const etaData = etaCalculator.recalculateETA(location, delivery.deliveryLocation, partner.vehicleType);
            delivery.estimatedTime = etaData.eta;
            await delivery.save();
            return { partner, delivery, eta: etaData };
        }
        return { partner };
    }

    async getDeliveryByOrderId(orderId) {
        return await Delivery.findOne({ orderId }).populate('partnerId').populate('orderId');
    }
}

module.exports = new DeliveryTrackingService();