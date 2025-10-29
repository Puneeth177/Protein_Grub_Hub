const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const auth = require('../middleware/auth');
const Product = require('../models/product.model');
const Reservation = require('../models/reservation.model');

// Helper for case-insensitive exact name match
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findProductByNameInsensitive(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  return await Product.findOne({ name: { $regex: new RegExp('^' + escapeRegExp(trimmed) + '$', 'i') } }).lean();
}

const NAME_ALIASES = {
  'High Protein Chicken Bowl': ['Grilled Chicken Power Bowl', 'Chicken Power Bowl'],
  'Plant-Based Protein Stack': ['Plant Based Protein Stack', 'Protein Stack'],
  'Salmon & Sweet Potato': ['Salmon and Sweet Potato', 'Salmon Sweet Potato']
};

async function findProductByAliasesOrName(name) {
  // exact-insensitive first
  let p = await findProductByNameInsensitive(name);
  if (p) return p;
  // alias fallbacks
  const aliases = NAME_ALIASES[name] || [];
  for (const alias of aliases) {
    p = await findProductByNameInsensitive(alias);
    if (p) return p;
  }
  return null;
}

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '') // remove non-alphanumerics and spaces
    .trim();
}

async function findProductByLooseName(name) {
  const target = normalizeName(name);
  if (!target) return null;
  // Small catalog assumption: scan names in memory for robust normalization
  const all = await Product.find({}, 'name desc protein calories price image_url').lean();
  for (const p of all) {
    if (normalizeName(p.name) === target) return p;
  }
  return null;
}

async function getAvailabilityMap(productIds, excludeUserId) {
  if (!productIds || productIds.length === 0) return new Map();
  const ids = productIds.map(id => new mongoose.Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: ids } }).select('_id inventory').lean();
  const invMap = new Map(products.map(p => [String(p._id), (typeof p.inventory === 'number' ? p.inventory : undefined)]));

  const reserved = await Reservation.aggregate([
    { $match: { userId: { $ne: new mongoose.Types.ObjectId(excludeUserId) } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $in: ids } } },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.quantity' } } }
  ]);
  const reservedMap = new Map(reserved.map(r => [String(r._id), r.qty || 0]));

  const availability = new Map();
  for (const p of ids) {
    const pid = String(p);
    // If inventory is missing (legacy docs), treat as virtually unlimited to avoid false removals
    const invVal = invMap.has(pid) ? invMap.get(pid) : Number.MAX_SAFE_INTEGER;
    const inv = typeof invVal === 'number' ? invVal : Number.MAX_SAFE_INTEGER;
    const held = reservedMap.get(pid) ?? 0;
    availability.set(pid, Math.max(0, inv - held));
  }
  console.log('Availability for user', excludeUserId, availability);
  return availability;
}

// Get user's cart (reconcile against availability and refresh reservation)
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ 
                userId: req.user.userId, 
                items: [], 
                subtotal: 0 
            });
            await cart.save();
            return res.json({ cart, warnings: [] });
        }

        const warnings = [];
        if (Array.isArray(cart.items) && cart.items.length > 0) {
            // Resolve legacy items that lack a valid ObjectId but have a recognizable name
            let resolvedAny = false;
            for (const it of cart.items) {
                const pid = it?.meal?._id;
                const nm = it?.meal?.name;
                if (!mongoose.isValidObjectId(pid) && nm) {
                    let p = await findProductByAliasesOrName(nm);
                    if (!p) {
                      p = await findProductByLooseName(nm);
                    }
                    if (p) {
                        it.meal = {
                            _id: String(p._id),
                            name: p.name,
                            description: p.desc,
                            protein_grams: p.protein,
                            calories: p.calories,
                            price: p.price,
                            image_url: p.image_url || it.meal?.image_url || null
                        };
                        resolvedAny = true;
                    }
                }
            }

            const productIds = [...new Set(
                cart.items
                    .filter(i => mongoose.isValidObjectId(i?.meal?._id))
                    .map(i => i.meal._id)
            )];

            const availability = await getAvailabilityMap(productIds, req.user.userId);

            const reconciled = [];
            for (const it of cart.items) {
                const pid = it?.meal?._id;
                if (!mongoose.isValidObjectId(pid)) {
                    // Legacy/local items without valid ObjectId: keep them as-is (no availability check)
                    reconciled.push(it);
                    continue;
                }
                const avail = availability.get(String(pid));
                if (typeof avail !== 'number') { reconciled.push(it); continue; }
                if (avail <= 0) {
                    warnings.push({ code: 'OUT_OF_STOCK', productId: pid, name: it.meal?.name });
                    continue; // drop
                }
                if (it.quantity > avail) {
                    warnings.push({ code: 'QTY_REDUCED', productId: pid, name: it.meal?.name, newQty: avail });
                    it.quantity = avail;
                }
                reconciled.push(it);
            }

            const changed = reconciled.length !== cart.items.length || reconciled.some((it, idx) => it.quantity !== cart.items[idx]?.quantity) || resolvedAny === true;
            if (changed) {
                cart.items = reconciled;
                cart.subtotal = reconciled.reduce((t, i) => t + ((i.meal?.price || 0) * i.quantity), 0);
                await cart.save();
            }

            // Always refresh reservation for this user (even if nothing changed) to keep TTL alive
            {
                const itemsForReservation = cart.items.filter(i => mongoose.isValidObjectId(i.meal._id)).map(i => ({
                    productId: new mongoose.Types.ObjectId(i.meal._id),
                    quantity: i.quantity
                }));
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
                if (itemsForReservation.length > 0) {
                    await Reservation.updateOne(
                        { userId: req.user.userId },
                        { $set: { items: itemsForReservation, expiresAt } },
                        { upsert: true }
                    );
                } else {
                    await Reservation.deleteOne({ userId: req.user.userId });
                }
            }

            return res.json({ cart, warnings });
        }

        return res.json({ cart, warnings: [] });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update entire cart (normalize, cap by availability, update reservation, return warnings)
router.post('/', auth, async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Invalid payload: items must be an array' });
        }

        let cart = await Cart.findOne({ userId: req.user.userId });
        if (!cart) {
            cart = new Cart({ userId: req.user.userId, items: [], subtotal: 0 });
        }

        // Prepare warnings and normalization structures
        const warnings = [];
        const normalized = [];
        const productForNormalized = []; // parallel array: product doc or null per normalized item
        for (const i of items) {
            let p = null;
            let qty = typeof i?.quantity === 'number' ? i.quantity : 0;
            if (qty <= 0) continue;

            if (i?.productId && mongoose.isValidObjectId(i.productId)) {
                p = await Product.findById(i.productId).lean();
            } else if (i?.meal) {
                if (i.meal._id && mongoose.isValidObjectId(i.meal._id)) {
                    p = await Product.findById(i.meal._id).lean();
                }
                if (!p && i.meal.name) {
                    // Case-insensitive exact name match to handle minor casing/whitespace differences
                    p = await findProductByAliasesOrName(i.meal.name);
                    if (!p) {
                      // Loose normalization fallback (strip punctuation, hyphens, ampersands, spaces)
                      p = await findProductByLooseName(i.meal.name);
                    }
                }
            }

            if (p) {
                // Use authoritative product fields
                normalized.push({
                    meal: {
                        _id: String(p._id),
                        name: p.name,
                        description: p.desc,
                        protein_grams: p.protein,
                        calories: p.calories,
                        price: p.price,
                        image_url: p.image_url || i?.meal?.image_url || null
                    },
                    quantity: qty,
                    customizations: Array.isArray(i.customizations) ? i.customizations : []
                });
                productForNormalized.push(p);
            } else if (i?.meal) {
                // If product can't be resolved, require minimal fields to be able to save cart (price and name)
                const mealName = i.meal.name;
                const mealPrice = i.meal.price;
                if (typeof mealPrice !== 'number' || !isFinite(mealPrice)) {
                    warnings.push({ code: 'UNRESOLVED_ITEM_SKIPPED', reason: 'Missing price for unresolved product', name: mealName });
                    continue; // skip invalid unresolved item to avoid schema validation error
                }
                normalized.push({
                    meal: {
                        _id: String(i.meal._id || ''),
                        name: mealName,
                        description: i.meal.description ?? i.meal.desc,
                        protein_grams: i.meal.protein_grams ?? i.meal.protein,
                        calories: i.meal.calories,
                        price: mealPrice,
                        image_url: i.meal.image_url
                    },
                    quantity: qty,
                    customizations: Array.isArray(i.customizations) ? i.customizations : []
                });
                productForNormalized.push(null);
            }
        }

        // Availability-aware capping/removal
        const productIds = [...new Set(productForNormalized.filter(Boolean).map(p => String(p._id)))];
        const availability = await getAvailabilityMap(productIds, req.user.userId);
        console.log('Availability for user', req.user.userId, availability);

        const adjusted = [];
        const reservationItems = [];

        for (let idx = 0; idx < normalized.length; idx++) {
            const norm = normalized[idx];
            const p = productForNormalized[idx];
            if (p) {
                const pid = String(p._id);
                const avail = availability.get(pid);
                if (typeof avail === 'number') {
                    if (avail <= 0) {
                        warnings.push({ code: 'OUT_OF_STOCK', productId: pid, name: p.name });
                        // Drop only from reservations; keep in cart shown? We will keep it visible but set qty to 0 would confuse subtotal.
                        // For now, keep in cart with qty adjusted to 0 so UI can remove; but simpler: keep as is and let GET reconcile remove.
                    } else if (norm.quantity > avail) {
                        warnings.push({ code: 'QTY_REDUCED', productId: pid, name: p.name, newQty: avail });
                        norm.quantity = avail;
                    }
                }
                adjusted.push(norm);
                if (norm.quantity > 0) {
                    reservationItems.push({ productId: new mongoose.Types.ObjectId(pid), quantity: norm.quantity });
                }
            } else {
                // Unresolvable product: keep in cart, but no reservation
                adjusted.push(norm);
            }
        }

        // Save cart
        cart.items = adjusted;
        cart.subtotal = adjusted.reduce((t, it) => t + ((it.meal?.price || 0) * it.quantity), 0);
        await cart.save();
        console.log('Cart saved for user', req.user.userId, 'items:', cart.items.length, 'subtotal:', cart.subtotal);

        // Refresh reservation for this user
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
        console.log('Reservation candidates:', productForNormalized.map(p => p && String(p._id)));
        console.log('Reservation items:', reservationItems);
        if (reservationItems.length > 0) {
            const upRes = await Reservation.updateOne(
                { userId: req.user.userId },
                { $set: { items: reservationItems, expiresAt } },
                { upsert: true }
            );
            console.log('Reservation upsert result:', upRes);
        } else {
            const delRes = await Reservation.deleteOne({ userId: req.user.userId });
            console.log('Reservation delete result:', delRes);
        }

        return res.json({ cart, warnings });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update cart item quantity
router.put('/update/:productId', auth, async (req, res) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => String(item?.meal?._id) === req.params.productId);
        
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
            await cart.save();
            res.json(cart);
        } else {
            res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => String(item?.meal?._id) !== req.params.productId);
        await cart.save();

        if (mongoose.isValidObjectId(req.params.productId)) {
            await Reservation.updateOne(
                { userId: req.user.userId },
                { 
                    $pull: { items: { productId: new mongoose.Types.ObjectId(req.params.productId) } },
                    $set: { expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
                }
            );
        }

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.userId });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = [];
        cart.subtotal = 0;
        cart.protein = 0;
        await cart.save();
        await Reservation.deleteOne({ userId: req.user.userId });
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;