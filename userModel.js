const mongoose = require('mongoose');

// Defines the User schema based on SRS sections 4.1 and 5.3
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // Will be hashed
    name: { type: String },
    
    // Onboarding info (FR2)
    fitness_goal: { type: String, enum: ['Build Muscle', 'Lose Weight', 'Improve Performance', 'Maintain Health'] },
    dietary_preferences: [String], // e.g., ["Vegan", "Gluten-Free"]
    allergies: [String],

    // For protein calculation (FR5)
    weight_kg: Number,
    height_cm: Number,
    activity_level: String,

}, { timestamps: true });

// TODO: Add pre-save hook to hash password before saving

const User = mongoose.model('User', userSchema);
module.exports = User;