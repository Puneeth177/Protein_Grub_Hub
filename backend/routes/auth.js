const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const auth = require('../middleware/auth');
const { sendMail } = require('../services/email/emailService');
const templates = require('../services/email/templates');

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

        const { email, password, name, avatarUrl } = req.body;
        
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
            avatar: avatarUrl ? { url: avatarUrl } : undefined,
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

        // Create email verification token and send email (non-Google signup)
        try {
            const token = crypto.randomBytes(32).toString('hex');
            user.emailVerificationToken = token;
            user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
            await user.save();

            const verifyUrlBase = process.env.FRONTEND_URL || 'http://localhost:4201';
            const verifyUrl = `${verifyUrlBase}/verify-email?token=${token}`;
            const firstName = user.name?.split(' ')[0] || 'there';
            const vars = { firstName, verifyUrl, expiresInHours: 24 };
            const subject = templates.verifyEmail.subject;
            const html = templates.verifyEmail.html(vars);
            const text = templates.verifyEmail.text(vars);
            if (user.email) {
                sendMail({ to: user.email, subject, html, text }).catch(e => {
                    console.error('Verification email send failed:', e.message);
                });
            }
        } catch (e) {
            console.error('Register: verification email error:', e.message);
        }

        // Create and return JWT token
        const token = jwt.sign(
            { userId: user._id, isAdmin: !!user.isAdmin, role: user.role || 'user' },
            process.env.JWT_SECRET || 'pgh_jwt_secret_key_f8K9mP2xL5vN3qR7tY4wZ1hJ6nB9cX0',
            { expiresIn: '24h' }
        );

        // Return user data without password
        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatar?.url,
            isAuthenticated: true,
            isAdmin: !!user.isAdmin,
            role: user.role || 'user'
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

        if (!user.emailVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }

        // Create and send token
        const token = jwt.sign(
            { userId: user._id, isAdmin: !!user.isAdmin, role: user.role || 'user' },
            process.env.JWT_SECRET || 'your-default-secret',
            { expiresIn: '24h' }
        );

        // Return user data without password
        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatar?.url, 
            isAuthenticated: true,
            isAdmin: !!user.isAdmin,
            role: user.role || 'user',
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
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    try {
        const { idToken, credential } = req.body;
        const googleIdToken = idToken || credential;
        if (!googleIdToken) {
            return res.status(400).json({ message: 'Missing idToken' });
        }

        const audience = process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID;
        const ticket = await googleClient.verifyIdToken({
            idToken: googleIdToken,
            audience
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
                avatar: payload.picture ? { url: payload.picture } : undefined,
                onboardingCompleted: false,
                fitnessGoal: '',
                dietaryPreferences: [],
                healthInfo: {}
            });
            await user.save();
        } else if (!user.avatar?.url && payload.picture) {
            // Backfill avatar for existing user if not set
            user.avatar = { url: payload.picture };
            await user.save();
        }

        // Create JWT for your app
        console.log('Creating JWT for user:', user._id);
        const token = jwt.sign(
            { userId: user._id, isAdmin: !!user.isAdmin, role: user.role || 'user' },
            process.env.JWT_SECRET || 'your-default-secret',
            { expiresIn: '24h' }
        );

        const userResponse = {
            _id: user._id,
            email: user.email,
            name: user.name,
            isAuthenticated: true,
            isAdmin: !!user.isAdmin,
            role: user.role || 'user',
            proteinGoal: user.proteinGoal,
            onboardingCompleted: user.onboardingCompleted,
            fitnessGoal: user.fitnessGoal,
            dietaryPreferences: user.dietaryPreferences,
            healthInfo: user.healthInfo,
            avatarUrl: user.avatar?.url
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

        // Handle avatar URL explicitly
        if (req.body.avatarUrl !== undefined) {
            if (req.body.avatarUrl) {
                user.avatar = { url: req.body.avatarUrl };
            } else {
                user.avatar = undefined;
            }
        }

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
            healthInfo: user.healthInfo,
            avatarUrl: user.avatar?.url
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

// Resend verification email
router.post('/verify/resend', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.googleId) return res.status(400).json({ message: 'Google accounts are already verified' });
        if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

        const token = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = token;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        const verifyUrlBase = process.env.FRONTEND_URL || 'http://localhost:4201';
        const verifyUrl = `${verifyUrlBase}/verify-email?token=${token}`;
        const firstName = user.name?.split(' ')[0] || 'there';
        const vars = { firstName, verifyUrl, expiresInHours: 24 };
        const subject = templates.verifyEmail.subject;
        const html = templates.verifyEmail.html(vars);
        const text = templates.verifyEmail.text(vars);
        await sendMail({ to: user.email, subject, html, text });
        res.json({ message: 'Verification email sent' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Failed to resend verification email' });
    }
});

// Verify email token
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: 'Verification token is required' });
        const user = await User.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ message: 'Failed to verify email' });
    }
});

module.exports = router;