const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    // Use the same default secret as routes/auth.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pgh_jwt_secret_key_f8K9mP2xL5vN3qR7tY4wZ1hJ6nB9cX0');
    req.user = decoded;
    // TEMP DEBUG
    console.log('Auth decoded user', decoded);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;