/*
  Seed script to insert or update 10 supplement products.
  Usage:
    node backend/scripts/seed-supplements.js

  It connects using backend/config/database.js (MONGODB_URI env or local default).
*/
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/database');
const Product = require('../models/product.model');

(async function run() {
  try {
    // Connect
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB');

    // Normalize helpers
    const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
    const normalizeCategory = (c) => String(c || '').trim().toLowerCase() === 'supplement' ? 'supplement' : 'supplement';

    // Seed data (normalized to backend schema)
    const items = [
      {
        name: 'Whey Protein Isolate',
        desc: 'Highly pure whey protein isolate powder for rapid absorption and lean muscle support.',
        category: 'supplement',
        price: 1200,
        protein: 90,
        calories: 380,
        carbs: 2,
        fat: 1,
        inventory: 100,
        image_url: 'https://healthfarmnutrition.com/cdn/shop/files/01_1d0d2c09-7159-40cb-aa48-d9c659c4d226.jpg?v=1738919980&width=1500',
        dietary_tags: [],
        tags: ['powder','whey-protein','isolate','high-protein','muscle','fast-absorption']
      },
      {
        name: 'Whey Protein Concentrate',
        desc: 'Classic whey protein concentrate for balanced daily nutrition and muscle building.',
        category: 'supplement',
        price: 999,
        protein: 80,
        calories: 400,
        carbs: 6,
        fat: 5,
        inventory: 90,
        image_url: 'https://myogenetix.in/wp-content/uploads/2020/10/MGX-WPC-5-lbs-Curved-FRONT-1000.jpg',
        dietary_tags: [],
        tags: ['powder','whey-protein','concentrate','daily-nutrition','muscle','balanced']
      },
      {
        name: 'Casein Protein Powder',
        desc: 'Slow-digesting micellar casein powder for overnight muscle recovery.',
        category: 'supplement',
        price: 1350,
        protein: 78,
        calories: 360,
        carbs: 4,
        fat: 1.5,
        inventory: 50,
        image_url: 'https://m.media-amazon.com/images/I/71gk2z736nL._AC_UF1000,1000_QL80_.jpg',
        dietary_tags: [],
        tags: ['powder','casein','slow-release','recovery','overnight','muscle']
      },
      {
        name: 'Pea Protein Isolate',
        desc: 'Plant-based pea protein isolate suitable for vegans and hypoallergenic diets.',
        category: 'supplement',
        price: 1150,
        protein: 85,
        calories: 380,
        carbs: 2,
        fat: 1,
        inventory: 60,
        image_url: 'https://5.imimg.com/data5/SELLER/Default/2025/8/532675195/WN/VQ/ZY/27715467/pea-protein-isolate.jpg',
        dietary_tags: ['vegan'],
        tags: ['powder','isolate','pea-protein','plant-based','vegan','hypoallergenic','clean']
      },
      {
        name: 'Soy Protein Isolate',
        desc: 'High-quality soy protein isolate for plant-based nutrition and muscle maintenance.',
        category: 'supplement',
        price: 990,
        protein: 88,
        calories: 370,
        carbs: 1,
        fat: 1,
        inventory: 70,
        image_url: 'https://5.imimg.com/data5/SELLER/Default/2024/3/397527288/QC/MV/AB/1310587/soya-protein-isolate.jpg',
        dietary_tags: ['vegan'],
        tags: ['powder','isolate','soy-protein','plant-based','vegan','muscle-maintenance']
      },
      {
        name: 'Mixed Plant Protein Blend',
        desc: 'Blend of different plant proteins for a complete amino acid profile and balanced nutrition.',
        category: 'supplement',
        price: 1500,
        protein: 75,
        calories: 385,
        carbs: 4,
        fat: 3,
        inventory: 40,
        image_url: 'https://www.myprotein.com/images?url=https://static.thcdn.com/productimg/original/13972449-9835179481059557.jpg',
        dietary_tags: ['vegan'],
        tags: ['blend','powder','plant-protein','complete-profile','vegan','balanced']
      },
      {
        name: 'Protein Bars Homemade',
        desc: 'Homemade protein bars with wholesome ingredients, perfect for on-the-go snacking.',
        category: 'supplement',
        price: 129,
        protein: 20,
        calories: 295,
        carbs: 25,
        fat: 5,
        inventory: 25,
        image_url: 'https://www.wellplated.com/wp-content/uploads/2024/12/Best-Peanut-Butter-Protein-Bar-Recipe-scaled.jpg',
        dietary_tags: [],
        tags: ['bar','homemade','snack','on-the-go','wholesome','portable','energy']
      },
      {
        name: 'No Bake Protein Bars',
        desc: 'Quick-prep no-bake protein bars for convenient and nutritious energy.',
        category: 'supplement',
        price: 149,
        protein: 18,
        calories: 245,
        carbs: 26,
        fat: 7,
        inventory: 30,
        image_url: 'https://i0.wp.com/www.imbored-letsgo.com/wp-content/uploads/2021/01/No-Bake-Peanut-Butter-Banana-Protien-Bars.jpg?ssl=1',
        dietary_tags: [],
        tags: ['bar','no-bake','quick-prep','energy','convenient','nutritious','snack']
      },
      {
        name: 'Mass Gainer High Protein',
        desc: 'High-protein mass gainer for muscle growth and calorie surplus during bulking.',
        category: 'supplement',
        price: 2200,
        protein: 25,
        calories: 450,
        carbs: 60,
        fat: 5,
        inventory: 30,
        image_url: 'https://img6.hkrtcdn.com/39776/prd_3977535-MuscleBlaze-High-Protein-Gold-Gainer-6.6-lb-Chocolate_o.jpg',
        dietary_tags: [],
        tags: ['powder','mass-gainer','bulk','growth','calorie-surplus']
      },
      {
        name: 'Egg White Protein Powder',
        desc: 'Egg white protein powder for non-vegetarian, lactose-free precision muscle building.',
        category: 'supplement',
        price: 1300,
        protein: 82,
        calories: 350,
        carbs: 0,
        fat: 0,
        inventory: 35,
        image_url: 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/mrm/mrm72071/y/8.jpg',
        dietary_tags: ['nonveg'],
        tags: ['powder','egg-white','lactose-free','muscle','lean']
      }
    ];

    // Upsert by name+category to avoid duplicates on re-run
    let inserted = 0, updated = 0;
    for (const raw of items) {
      const doc = {
        name: String(raw.name).trim(),
        desc: raw.desc,
        category: normalizeCategory(raw.category),
        price: Number(raw.price),
        protein: Number(raw.protein),
        calories: Number(raw.calories),
        carbs: Number(raw.carbs),
        fat: Number(raw.fat),
        inventory: Number(raw.inventory),
        image_url: raw.image_url,
        dietary_tags: toArray(raw.dietary_tags),
        tags: toArray(raw.tags)
      };

      const existing = await Product.findOne({ name: doc.name, category: doc.category });
      if (existing) {
        await Product.updateOne({ _id: existing._id }, { $set: doc });
        updated++;
        console.log(`Updated: ${doc.name}`);
      } else {
        await Product.create(doc);
        inserted++;
        console.log(`Inserted: ${doc.name}`);
      }
    }

    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
