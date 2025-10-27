require('dotenv').config();  // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/db');
const path = require('path');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:52023'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'frontend/dist/frontend')));

// API Health check
app.get('/api', (req, res) => {
    res.send('Protein Grub Hub API is running...');
});

// Handle Angular routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Server Initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});