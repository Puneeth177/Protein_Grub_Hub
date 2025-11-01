/*
  Seed script to insert or update 10 additional meals for the Browse Meals section.
  Usage:
    node backend/scripts/seed-meals-extra.js
*/
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/database');
const Product = require('../models/product.model');

(async function run() {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB');

    const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
    const normCat = (c) => String(c || '').trim().toLowerCase();

    // 10 legit meals with reliable image URLs
    const items = [
      {
        name: 'Grilled Chicken Power Bowl',
        desc: 'Grilled chicken with brown rice, roasted veggies, and a lemon herb sauce.',
        category: 'main-course',
        price: 349,
        protein: 42,
        calories: 520,
        carbs: 50,
        fat: 14,
        inventory: 25,
        image_url: 'https://i.pinimg.com/736x/0f/00/72/0f00726ff768a2c272db4e05a5a113de.jpg',
        dietary_tags: ['nonveg', 'chicken'],
        tags: ['high-protein','bowl','grilled','healthy']
      },
      {
        name: 'Chicken & Sweet Potato',
        desc: 'Grilled chicken served with roasted sweet potatoes and greens.',
        category: 'dinner',
        price: 449,
        protein: 38,
        calories: 540,
        carbs: 32,
        fat: 24,
        inventory: 18,
        image_url: 'https://zenaskitchen.com/wp-content/uploads/2022/01/Cajun-Chicken-Sweet-Potato-Bowls.jpg',
        dietary_tags: ['nonveg','chicken'],
        tags: ['chicken','high-protein','roasted','balanced']
      },
      {
        name: 'Veggie Quinoa Bowl',
        desc: 'Quinoa with grilled seasonal vegetables, chickpeas, and tahini dressing.',
        category: 'lunch',
        price: 299,
        protein: 22,
        calories: 480,
        carbs: 58,
        fat: 14,
        inventory: 30,
        image_url: 'https://avocadopesto.com/wp-content/uploads/2014/07/Thai-Veggie-Quinoa-Bowl.jpg',
        dietary_tags: ['vegan'],
        tags: ['plant-based','bowl','fiber','clean']
      },
      {
        name: 'Paneer Tikka Wrap',
        desc: 'Whole wheat wrap filled with paneer tikka, greens, and yogurt mint sauce.',
        category: 'lunch',
        price: 279,
        protein: 26,
        calories: 520,
        carbs: 46,
        fat: 18,
        inventory: 28,
        image_url: 'hhttps://spicecravings.com/wp-content/uploads/2020/12/Paneer-kathi-Roll-Featured-1-500x500.jpg',
        dietary_tags: ['vegetarian'],
        tags: ['wrap','indian','tikka','high-protein']
      },
      {
        name: 'Chicken Protein Wrap',
        desc: 'Grilled chicken slices with avocado, lettuce, and tomato in a whole grain wrap.',
        category: 'lunch',
        price: 319,
        protein: 32,
        calories: 460,
        carbs: 38,
        fat: 15,
        inventory: 22,
        image_url: 'https://mealmatcher.co.uk/media/recipe_images/High_Protein_Chicken_Caesar_Salad_Wrap_ZNbbVh8.webp',
        dietary_tags: ['nonveg','chicken'],
        tags: ['wrap','lean','high-protein','chicken']
      },
      {
        name: 'Tofu Stir-Fry',
        desc: 'Crispy tofu with colorful veggies tossed in a savory soy-ginger sauce.',
        category: 'dinner',
        price: 289,
        protein: 24,
        calories: 430,
        carbs: 44,
        fat: 12,
        inventory: 26,
        image_url: 'https://naturallieplantbased.com/wp-content/uploads/2024/02/peanut-tofu-stir-fry-6-500x500.jpg',
        dietary_tags: ['vegan'],
        tags: ['tofu','stir-fry','plant-based','light']
      },
      {
        name: 'Chicken Caesar Salad',
        desc: 'Classic Caesar salad topped with grilled chicken and shaved parmesan.',
        category: 'dinner',
        price: 329,
        protein: 34,
        calories: 480,
        carbs: 22,
        fat: 22,
        inventory: 24,
        image_url: 'https://www.allrecipes.com/thmb/YklaDZF1zj7z4bU8Q28mYFryr5g=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/3186344-9400cb8415144a2db2660cd6762c8cde.jpg',
        dietary_tags: ['nonveg','chicken'],
        tags: ['salad','chicken','high-protein','fresh']
      },
      {
        name: 'Chickpea Protein Salad',
        desc: 'Fresh salad with chickpeas, cucumber, tomatoes, and lemon-olive dressing.',
        category: 'snack',
        price: 199,
        protein: 18,
        calories: 350,
        carbs: 34,
        fat: 10,
        inventory: 40,
        image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT99lzdrkYy27U9zq3zaB7J4ZN4dI52Biw6oQ&s',
        dietary_tags: ['vegan'],
        tags: ['salad','light','refreshing','fiber']
      },
      {
        name: 'Chicken Spinach Omelette',
        desc: 'Egg white omelette with grilled chicken, spinach, and mushrooms.',
        category: 'breakfast',
        price: 219,
        protein: 32,
        calories: 360,
        carbs: 9,
        fat: 8,
        inventory: 30,
        image_url: 'https://www.unlockfood.ca/EatRightOntario/media/ERO_Images/Chicken-and-Spinach-Omelette-resized_1.jpg',
        dietary_tags: ['nonveg','chicken'],
        tags: ['omelette','chicken','high-protein','breakfast']
      }
    ];

    let inserted = 0, updated = 0;
    for (const raw of items) {
      const doc = {
        name: String(raw.name).trim(),
        desc: raw.desc,
        category: normCat(raw.category),
        price: Number(raw.price),
        protein: Number(raw.protein),
        calories: Number(raw.calories),
        carbs: Number(raw.carbs),
        fat: Number(raw.fat),
        inventory: Number(raw.inventory),
        image_url: raw.image_url,
        dietary_tags: toArray(raw.dietary_tags).map(t => String(t).toLowerCase()),
        tags: toArray(raw.tags).map(t => String(t).toLowerCase())
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
