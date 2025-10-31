const mongoose = require('mongoose');
const config = require('../config/database');

const connectDB = async () => {
    try {
        // Enable mongoose debugging
        mongoose.set('debug', true);

        const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // One-time cleanup: drop obsolete index payments.paymentId_1 if present
        try {
            const paymentsColl = mongoose.connection.collection('payments');
            const indexes = await paymentsColl.indexes();
            const legacyIdx = indexes.find(i => i.name === 'paymentId_1');
            if (legacyIdx) {
                await paymentsColl.dropIndex('paymentId_1');
                console.log('Dropped obsolete index payments.paymentId_1');
            }
        } catch (idxErr) {
            // Non-fatal; proceed even if we fail to inspect or drop index
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Index cleanup check failed (non-fatal):', idxErr?.message || idxErr);
            }
        }

        // Log when database operations occur
        mongoose.connection.on('error', err => {
            console.error('MongoDB error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;