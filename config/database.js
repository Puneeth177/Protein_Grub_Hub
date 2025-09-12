const config = {
    mongodb: {
        uri: `mongodb+srv://mspuneeth73_db_user:gwbfPevUA9tvE7RO@cluster0.p7irxmu.mongodb.net/protein-grub-hub?retryWrites=true&w=majority&appName=Cluster0`,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        }
    }
};

module.exports = config;