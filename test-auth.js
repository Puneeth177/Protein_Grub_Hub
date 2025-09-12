const axios = require('axios');

async function testRegistration() {
    try {
        // Test registration
        const registrationResponse = await axios.post('http://localhost:3000/api/auth/register', {
            email: 'testuser@example.com',
            password: 'testpassword123',
            name: 'Test User'
        });
        console.log('\nRegistration Response:', registrationResponse.data);

        // Test login with the registered user
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'testuser@example.com',
            password: 'testpassword123'
        });
        console.log('\nLogin Response:', loginResponse.data);

        // Test profile fetch
        const token = loginResponse.data.token;
        const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('\nProfile Response:', profileResponse.data);

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testRegistration();