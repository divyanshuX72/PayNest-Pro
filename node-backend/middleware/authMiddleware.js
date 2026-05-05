const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // Bearer token support
        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;

        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
