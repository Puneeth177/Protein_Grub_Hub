const mongoose = require('mongoose');
const config = require('./config/database');
const User = require('./models/user.model');

async function testConnection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongodb.uri, config.mongodb.options);
        console.log('Successfully connected to MongoDB.');

        // Test User Collection
        const userCount = await User.countDocuments();
        console.log(`Number of users in database: ${userCount}`);

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });

        // Create a test user
        const testUser = new User({
            email: 'test@example.com',
            password: 'hashedpassword123',
            name: 'Test User',
            proteinGoal: 150,
            onboardingCompleted: true
        });

        // Save the test user
        await testUser.save();
        console.log('\nTest user created successfully');

        // Retrieve the test user
        const savedUser = await User.findOne({ email: 'test@example.com' });
        console.log('\nRetrieved test user:', {
            id: savedUser._id,
            email: savedUser.email,
            name: savedUser.name
        });

        // Clean up - delete test user
        await User.deleteOne({ email: 'test@example.com' });
        console.log('\nTest user cleaned up successfully');

    } catch (error) {
        console.error('Database test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDatabase connection closed');
    }
}

testConnection();