const config = {
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/protein-grub-hub',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        }
    }
};

module.exports = config;