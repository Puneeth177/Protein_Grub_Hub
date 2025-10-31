require('dotenv').config();
const connectDB = require('./backend/utils/db');
const Product = require('./backend/models/product.model');

const products = [
    {
        name: 'Grilled Chicken Power Bowl',
        desc: 'Perfectly seasoned grilled chicken breast with quinoa, roasted vegetables, and avocado',
        category: 'Meals',
        price: 299,
        protein: 45,
        calories: 450,
        carbs: 35,
        fat: 12,
        inventory: 50,
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
        tags: ['meal','chicken','grilled','bowl','quinoa','vegetables','high-protein','balanced']
    },
    {
        name: 'Plant-Based Protein Stack',
        desc: 'Black bean and lentil patty with quinoa and mixed greens',
        category: 'Meals',
        price: 249,
        protein: 25,
        calories: 350,
        carbs: 40,
        fat: 8,
        inventory: 60,
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        tags: ['meal','plant-based','vegan','lentil','quinoa','greens','fiber','balanced']
    },
    {
        name: 'Salmon & Sweet Potato',
        desc: 'Wild-caught salmon with roasted sweet potato and steamed broccoli',
        category: 'Meals',
        price: 399,
        protein: 40,
        calories: 420,
        carbs: 35,
        fat: 15,
        inventory: 30,
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
        tags: ['meal','salmon','fish','omega-3','sweet-potato','broccoli','balanced']
    },
    {
        name: 'High Protein Chicken Bowl',
        desc: 'Grilled chicken breast with quinoa and vegetables',
        category: 'Meals',
        price: 299,
        protein: 40,
        calories: 450,
        carbs: 35,
        fat: 12,
        inventory: 50,
        image_url: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800&q=80',
        tags: ['meal','chicken','bowl','quinoa','vegetables','high-protein']
    },
    {
        name: 'Protein Smoothie',
        desc: 'Whey protein with banana, berries, and almond milk',
        category: 'Drinks',
        price: 179,
        protein: 25,
        calories: 300,
        carbs: 30,
        fat: 5,
        inventory: 100,
        image_url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80',
        tags: ['drink','smoothie','whey','banana','berries','post-workout','high-protein']
    },
    {
        name: 'Power Protein Bar',
        desc: 'Homemade protein bar with nuts and dark chocolate',
        category: 'Snacks',
        price: 99,
        protein: 15,
        calories: 200,
        carbs: 20,
        fat: 8,
        inventory: 200,
        image_url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=800&q=80',
        tags: ['snack','bar','nuts','dark-chocolate','on-the-go','protein']
    },
    {
        name: 'Salmon Protein Pack',
        desc: 'Fresh grilled salmon with sweet potato and broccoli',
        category: 'Meals',
        price: 399,
        protein: 35,
        calories: 480,
        carbs: 40,
        fat: 15,
        inventory: 30,
        image_url: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80',
        tags: ['meal','salmon','grilled','sweet-potato','broccoli','protein-pack']
    },
    {
        name: 'Protein Pancakes',
        desc: 'Fluffy protein-rich pancakes with berries',
        category: 'Breakfast',
        price: 249,
        protein: 28,
        calories: 350,
        carbs: 45,
        fat: 8,
        inventory: 40,
        image_url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800&q=80',
        tags: ['breakfast','pancakes','berries','sweet','protein']
    },
    {
        name: 'Turkey Protein Wrap',
        desc: 'Lean turkey with avocado and veggies in a protein wrap',
        category: 'Meals',
        price: 279,
        protein: 32,
        calories: 400,
        carbs: 25,
        fat: 14,
        inventory: 45,
        image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80',
        tags: ['meal','turkey','wrap','avocado','veggies','high-protein']
    },
    {
        name: 'Chicken Tikka Masala',
        desc: 'Grilled chicken breast in a creamy tomato sauce with basmati rice',
        category: 'Meals',
        price: 349,
        protein: 38,
        calories: 500,
        carbs: 40,
        fat: 18,
        inventory: 40,
        image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80',
        tags: ['meal','chicken','tikka-masala','rice','indian','spicy','comfort']
    },
    {
        name: 'Palak Paneer',
        desc: 'Spinach and paneer cheese curry with brown rice',
        category: 'Meals',
        price: 299,
        protein: 20,
        calories: 400,
        carbs: 35,
        fat: 15,
        inventory: 50,
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
        tags: ['meal','vegetarian','paneer','spinach','curry','indian']
    },
    {
        name: 'Chana Masala',
        desc: 'North Indian-style chickpea curry with brown rice',
        category: 'Meals',
        price: 249,
        protein: 15,
        calories: 350,
        carbs: 40,
        fat: 10,
        inventory: 60,
        image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
        tags: ['meal','vegan','chickpea','curry','indian','spiced']
    },
    {
        name: 'Rajma Masala',
        desc: 'Punjabi-style kidney bean curry with brown rice',
        category: 'Meals',
        price: 279,
        protein: 18,
        calories: 400,
        carbs: 35,
        fat: 12,
        inventory: 45,
        image_url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&q=80',
        tags: ['meal','vegan','kidney-beans','curry','indian','comfort']
    }
];

const bcrypt = require('bcryptjs');
const User = require('./backend/models/user.model');
const Review = require('./backend/models/review.model');

const seedDatabase = async () => {
    try {
        await connectDB();
        
        // Clear existing data
        await Product.deleteMany({});
        await User.deleteMany({});
        await Review.deleteMany({});
        
        // Insert new products
        const insertedProducts = await Product.insertMany(products);
        
        // Create test user
        const hashedPassword = await bcrypt.hash('test123', 10);
        const testUser = await User.create({
            email: 'test@example.com',
            password: hashedPassword,
            name: 'Test User',
            emailVerified: true,
            isAdmin: true,
            role: 'admin',
            onboardingCompleted: true,
            proteinGoal: 150,
            fitnessGoal: 'build_muscle',
            dietaryPreferences: ['none'],
            healthInfo: {
                age: '28',
                weight: '75',
                height: '175',
                activityLevel: 'moderate'
            }
        });
        
        // Create sample reviews
        const reviews = insertedProducts.slice(0, 3).map(product => ({
            userId: testUser._id,
            productId: product._id,
            author: {
                userId: testUser._id,
                name: testUser.name,
                avatarUrl: testUser.avatar?.url || null
            },
            rating: Math.floor(Math.random() * 2) + 4, // Random 4-5 star ratings
            text: 'Great product, exactly what I needed for my protein goals!'
        }));
        
        await Review.insertMany(reviews);
        
        console.log('Database seeded successfully with products, test user, and reviews!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
