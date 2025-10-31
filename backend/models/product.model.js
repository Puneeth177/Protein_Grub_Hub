const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    protein: { type: Number, required: true },
    calories: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    inventory: { type: Number, default: 0 },
    image_url: { type: String },
    // Dietary tags like 'vegan', 'vegetarian', 'keto', 'gluten-free', 'dairy-free', 'paleo'
    dietary_tags: [{ type: String }],
    // Generic searchable tags (keywords/categories)
    tags: [{ type: String }]
});

module.exports = mongoose.model('Product', productSchema);