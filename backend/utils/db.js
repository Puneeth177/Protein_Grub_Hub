const mongoose = require('mongoose');
const config = require('../config/database');

const connectDB = async () => {
    try {
        // Enable mongoose debugging
        mongoose.set('debug', true);

        const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
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