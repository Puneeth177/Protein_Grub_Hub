const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function() { return !this.googleId; } }, // Only required if not Google auth
    googleId: { type: String },
    name: { type: String, required: true },

    // Optional avatar snapshot
    avatar: {
        url: { type: String }
    },

    proteinGoal: { type: Number },
    onboardingCompleted: { type: Boolean, default: false },
    fitnessGoal: { type: String },
    dietaryPreferences: [{ type: String }],
    healthInfo: {
        age: { type: String },
        weight: { type: String },
        height: { type: String },
        activityLevel: { type: String }
    },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);