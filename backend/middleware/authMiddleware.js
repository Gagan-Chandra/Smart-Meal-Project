const jwt = require('jsonwebtoken');
// Read the JWT_SECRET from environment variable or fallback to a static secret for development
const JWT_SECRET = process.env.JWT_SECRET || 'ed38a16256fd69b7f7d46e62cea8797dc9539afdb0fed73a89ce8a93352e81bac160a96dcb08a20f514d2dce8b82a96720711c87e9075808eb4def39534e207c';

// Middleware function to authenticate the JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token missing.' });
    }

    // Verify the token using the static JWT_SECRET
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' });
        }
        req.user = user; // Attach the decoded user data to the request
        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = { authenticateToken };
