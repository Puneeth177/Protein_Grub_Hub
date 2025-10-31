const express = require('express');
const router = express.Router();
const Product = require('../models/product.model');
const auth = require('../middleware/auth');

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const requireAdmin = require('../middleware/requireAdmin');

// Create product (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const {
            name, desc, category,
            price, protein, calories, carbs, fat,
            inventory, image_url, dietary_tags, tags
        } = req.body || {};

        // Basic validations to avoid Mongoose cast errors
        const num = (v) => (v === '' || v === null || v === undefined) ? NaN : Number(v);
        const numericFields = {
            price: num(price), protein: num(protein), calories: num(calories), carbs: num(carbs), fat: num(fat)
        };
        const missing = [];
        if (!name || typeof name !== 'string') missing.push('name');
        if (!category || typeof category !== 'string') missing.push('category');
        Object.entries(numericFields).forEach(([k, v]) => { if (!Number.isFinite(v)) missing.push(k); });

        if (missing.length) {
            return res.status(400).json({ message: `Invalid or missing fields: ${missing.join(', ')}` });
        }

        const product = new Product({
            name: name.trim(),
            desc,
            category: category.trim(),
            price: numericFields.price,
            protein: numericFields.protein,
            calories: numericFields.calories,
            carbs: numericFields.carbs,
            fat: numericFields.fat,
            inventory: Number.isFinite(num(inventory)) ? num(inventory) : 0,
            image_url,
            dietary_tags: Array.isArray(dietary_tags) ? dietary_tags : [],
            tags: Array.isArray(tags) ? tags : []
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: error?.message || 'Server error' });
    }
});

// Update product (admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const allowed = ['name','desc','category','price','protein','calories','carbs','fat','inventory','image_url','dietary_tags'];
        const update = {};
        allowed.forEach(k => {
            if (req.body[k] !== undefined) update[k] = k === 'dietary_tags' ? (Array.isArray(req.body[k]) ? req.body[k] : []) : req.body[k];
        });

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/products/batch-tag
 * Body: { items: [{ id: string, dietary_tags: string[] }, ...] }
 * Auth required. Updates multiple products' dietary_tags in one request.
 */
router.post('/batch-tag', auth, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: 'No items provided' });

    const ops = items
      .filter(it => typeof it?.id === 'string')
      .map(it => ({
        updateOne: {
          filter: { _id: it.id },
          update: { $set: { dietary_tags: Array.isArray(it.dietary_tags) ? it.dietary_tags : [] } }
        }
      }));

    if (!ops.length) return res.status(400).json({ message: 'No valid updates' });

    const result = await Product.bulkWrite(ops);
    res.json({ message: 'Dietary tags updated', result });
  } catch (error) {
    console.error('batch-tag error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;