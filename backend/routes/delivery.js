const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const deliveryTrackingService = require('../services/delivery-tracking.service');
const DeliveryPartner = require('../models/delivery-partner.model');
const Delivery = require('../models/delivery.model');

router.post('/create', auth, async (req, res) => {
    try {
        const { orderId, deliveryAddress } = req.body;
        const delivery = await deliveryTrackingService.createDelivery(orderId, deliveryAddress);
        res.json({ message: 'Delivery created successfully', delivery });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:deliveryId/assign', auth, async (req, res) => {
    try {
        const result = await deliveryTrackingService.assignPartner(req.params.deliveryId);
        if (req.app.get('deliverySocketHandler')) {
            req.app.get('deliverySocketHandler').emitDeliveryAssigned(result.delivery.orderId, result.delivery, result.partner, result.eta);
        }
        res.json({ message: 'Partner assigned successfully', ...result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:deliveryId/status', auth, async (req, res) => {
    try {
        const { status, location, note } = req.body;
        const delivery = await deliveryTrackingService.updateDeliveryStatus(req.params.deliveryId, status, location, note);
        if (req.app.get('deliverySocketHandler')) {
            req.app.get('deliverySocketHandler').emitStatusChange(delivery.orderId, status, { delivery });
        }
        res.json({ message: 'Delivery status updated', delivery });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/order/:orderId', auth, async (req, res) => {
    try {
        const delivery = await deliveryTrackingService.getDeliveryByOrderId(req.params.orderId);
        if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
        res.json(delivery);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/partners', auth, async (req, res) => {
    try {
        const partners = await DeliveryPartner.find({ isActive: true });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/partners', auth, async (req, res) => {
    try {
        const partner = new DeliveryPartner(req.body);
        await partner.save();
        res.json({ message: 'Delivery partner created successfully', partner });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;