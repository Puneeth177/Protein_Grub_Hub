const { getDistance } = require('geolib');

class ETACalculatorService {
    constructor() {
        this.vehicleSpeeds = { bike: 25, scooter: 20, bicycle: 15, car: 30 };
        this.trafficMultiplier = 1.3;
    }

    calculateDistance(from, to) {
        const distanceInMeters = getDistance(
            { latitude: from.lat, longitude: from.lng },
            { latitude: to.lat, longitude: to.lng }
        );
        return distanceInMeters / 1000;
    }

    calculateETA(from, to, vehicleType = 'bike') {
        const distance = this.calculateDistance(from, to);
        const speed = this.vehicleSpeeds[vehicleType] || this.vehicleSpeeds.bike;
        const timeInHours = distance / speed;
        const etaInMinutes = Math.ceil(timeInHours * 60 * this.trafficMultiplier);
        return { distance: parseFloat(distance.toFixed(2)), eta: etaInMinutes, speed };
    }

    recalculateETA(currentLocation, destination, vehicleType = 'bike') {
        return this.calculateETA(currentLocation, destination, vehicleType);
    }

    estimatePreparationTime(itemCount) {
        return 10 + (itemCount * 3);
    }

    calculateTotalDeliveryTime(from, to, itemCount, vehicleType = 'bike') {
        const preparationTime = this.estimatePreparationTime(itemCount);
        const deliveryETA = this.calculateETA(from, to, vehicleType);
        return {
            preparationTime,
            deliveryTime: deliveryETA.eta,
            totalTime: preparationTime + deliveryETA.eta,
            distance: deliveryETA.distance
        };
    }

    setTrafficMultiplier(multiplier) {
        this.trafficMultiplier = multiplier;
    }
}

module.exports = new ETACalculatorService();