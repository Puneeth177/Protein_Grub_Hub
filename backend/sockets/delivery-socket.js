const deliveryTrackingService = require('../services/delivery-tracking.service');

class DeliverySocketHandler {
    constructor(io) {
        this.io = io;
        this.deliveryNamespace = io.of('/delivery');
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.deliveryNamespace.on('connection', (socket) => {
            console.log(`Client connected to delivery tracking: ${socket.id}`);

            socket.on('join:order', (orderId) => {
                socket.join(`order_${orderId}`);
                console.log(`Socket ${socket.id} joined order room: order_${orderId}`);
            });

            socket.on('join:partner', (partnerId) => {
                socket.join(`partner_${partnerId}`);
                console.log(`Socket ${socket.id} joined partner room: partner_${partnerId}`);
            });

            socket.on('partner:location:update', async (data) => {
                try {
                    const { partnerId, location } = data;
                    const result = await deliveryTrackingService.updatePartnerLocation(partnerId, location);

                    if (result.delivery) {
                        this.deliveryNamespace.to(`order_${result.delivery.orderId}`).emit('delivery:location:update', {
                            partnerId,
                            location,
                            eta: result.eta,
                            timestamp: new Date()
                        });

                        this.deliveryNamespace.to(`order_${result.delivery.orderId}`).emit('delivery:eta:update', {
                            eta: result.eta.eta,
                            distance: result.eta.distance,
                            timestamp: new Date()
                        });
                    }
                } catch (error) {
                    console.error('Error updating partner location:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('delivery:status:update', async (data) => {
                try {
                    const { deliveryId, status, location, note } = data;
                    const delivery = await deliveryTrackingService.updateDeliveryStatus(deliveryId, status, location, note);

                    this.deliveryNamespace.to(`order_${delivery.orderId}`).emit('delivery:status:update', {
                        status,
                        delivery,
                        timestamp: new Date()
                    });

                    if (delivery.partnerId) {
                        this.deliveryNamespace.to(`partner_${delivery.partnerId}`).emit('delivery:status:update', {
                            status,
                            delivery,
                            timestamp: new Date()
                        });
                    }
                } catch (error) {
                    console.error('Error updating delivery status:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected from delivery tracking: ${socket.id}`);
            });
        });
    }

    emitDeliveryAssigned(orderId, delivery, partner, eta) {
        this.deliveryNamespace.to(`order_${orderId}`).emit('delivery:assigned', {
            delivery,
            partner: {
                id: partner._id,
                name: partner.name,
                phone: partner.phone,
                vehicleType: partner.vehicleType,
                vehicleNumber: partner.vehicleNumber,
                rating: partner.rating
            },
            eta,
            timestamp: new Date()
        });
    }

    emitStatusChange(orderId, status, data = {}) {
        this.deliveryNamespace.to(`order_${orderId}`).emit('delivery:status:update', {
            status,
            ...data,
            timestamp: new Date()
        });
    }

    emitETAUpdate(orderId, eta, distance) {
        this.deliveryNamespace.to(`order_${orderId}`).emit('delivery:eta:update', {
            eta,
            distance,
            timestamp: new Date()
        });
    }
}

module.exports = DeliverySocketHandler;