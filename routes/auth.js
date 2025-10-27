const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const auth = require('../middleware/auth');

// Register user
router.post('/register', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
    console.log('Registration attempt:', { email: req.body.email, name: req.body.name });
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { email, password, name } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            email,
            name,
            password,
            onboardingCompleted: false,
            fitnessGoal: '',
            dietaryPreferences: [],
            healthInfo: {
                age: '',
                weight: '',
                height: '',
                activityLevel: ''
            }
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create and return JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-default-secret',
            { expiresIn: '24h' }
        );

        // Return user data without password
        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            isAuthenticated: true
        };

        res.status(201).json({
            user: userResponse,
            token,
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create and send token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-default-secret',
            { expiresIn: '24h' }
        );

        // Return user data without password
        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            isAuthenticated: true,
            proteinGoal: user.proteinGoal,
            onboardingCompleted: user.onboardingCompleted,
            fitnessGoal: user.fitnessGoal,
            dietaryPreferences: user.dietaryPreferences,
            healthInfo: user.healthInfo
        };

        res.json({
            user: userResponse,
            token,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Google Sign-In (ID token verification)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ message: 'Invalid Google token' });
        }

        const email = payload.email;
        const name = payload.name || '';
        const googleId = payload.sub; // Google's unique identifier

        // Find or create user
        let user = await User.findOne({ $or: [{ email }, { googleId }] });
        if (!user) {
            user = new User({
                email,
                name,
                googleId,
                onboardingCompleted: false,
                fitnessGoal: '',
                dietaryPreferences: [],
                healthInfo: {}
            });
            await user.save();
        }

        // Create JWT for your app
        console.log('Creating JWT for user:', user._id);
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-default-secret',
            { expiresIn: '24h' }
        );

        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            isAuthenticated: true,
            proteinGoal: user.proteinGoal,
            onboardingCompleted: user.onboardingCompleted,
            fitnessGoal: user.fitnessGoal,
            dietaryPreferences: user.dietaryPreferences,
            healthInfo: user.healthInfo
        };

        console.log('Google auth success - returning:', { userId: user._id, email: user.email });
        res.json({ user: userResponse, token, message: 'Login successful' });
    } catch (error) {
        console.error('Google sign-in error:', error);
        res.status(500).json({ message: 'Google sign-in failed' });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .select('+fitnessGoal +dietaryPreferences +healthInfo');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile and preferences
router.put('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only allowed fields
        const allowedUpdates = [
            'name', 'fitnessGoal', 'dietaryPreferences', 
            'healthInfo', 'proteinGoal', 'onboardingCompleted'
        ];
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();

        // Return updated user without password
        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            isAuthenticated: true,
            proteinGoal: user.proteinGoal,
            onboardingCompleted: user.onboardingCompleted,
            fitnessGoal: user.fitnessGoal,
            dietaryPreferences: user.dietaryPreferences,
            healthInfo: user.healthInfo
        };

        res.json({
            user: userResponse,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error during profile update' });
    }
});

module.exports = router;