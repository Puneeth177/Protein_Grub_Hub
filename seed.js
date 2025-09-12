const connectDB = require('./utils/db');
const Product = require('./models/product.model');

const products = [
    {
        name: 'High Protein Chicken Bowl',
        desc: 'Grilled chicken breast with quinoa and vegetables',
        category: 'Meals',
        price: 12.99,
        protein: 40,
        calories: 450,
        carbs: 35,
        fat: 12,
        inventory: 50
    },
    {
        name: 'Protein Smoothie',
        desc: 'Whey protein with banana, berries, and almond milk',
        category: 'Drinks',
        price: 7.99,
        protein: 25,
        calories: 300,
        carbs: 30,
        fat: 5,
        inventory: 100
    },
    {
        name: 'Power Protein Bar',
        desc: 'Homemade protein bar with nuts and dark chocolate',
        category: 'Snacks',
        price: 4.99,
        protein: 15,
        calories: 200,
        carbs: 20,
        fat: 8,
        inventory: 200
    },
    {
        name: 'Salmon Protein Pack',
        desc: 'Fresh grilled salmon with sweet potato and broccoli',
        category: 'Meals',
        price: 14.99,
        protein: 35,
        calories: 480,
        carbs: 40,
        fat: 15,
        inventory: 30
    },
    {
        name: 'Protein Pancakes',
        desc: 'Fluffy protein-rich pancakes with berries',
        category: 'Breakfast',
        price: 9.99,
        protein: 28,
        calories: 350,
        carbs: 45,
        fat: 8,
        inventory: 40
    },
    {
        name: 'Turkey Protein Wrap',
        desc: 'Lean turkey with avocado and veggies in a protein wrap',
        category: 'Meals',
        price: 10.99,
        protein: 32,
        calories: 400,
        carbs: 25,
        fat: 14,
        inventory: 45
    }
];

const bcrypt = require('bcryptjs');
const User = require('./models/user.model');
const Review = require('./models/review.model');

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
            age: 28,
            weight: 75,
            activity: 'moderate',
            fitness: 'build_muscle',
            dietary: 'none'
        });
        
        // Create sample reviews
        const reviews = insertedProducts.slice(0, 3).map(product => ({
            userId: testUser._id,
            productId: product._id,
            rating: Math.floor(Math.random() * 2) + 4, // Random 4-5 star ratings
            comment: 'Great product, exactly what I needed for my protein goals!',
            created: new Date()
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