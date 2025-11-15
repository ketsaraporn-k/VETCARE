// backEnd/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'petClinicSecretKey';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'vetcare_token';

module.exports = async (req, res, next) => {
  try {
    // 1) try Authorization header: "Bearer <token>"
    let token = null;
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
    }

    // 2) fallback to cookie
    if (!token && req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }

    if (!token) return res.status(401).json({ error: 'No token' });

    // verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload' });

    // fetch user from DB (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Invalid token (user not found)' });

    // Attach user document to request for downstream handlers
    req.user = user;

    // Also attach raw token & decoded (optional helpers)
    req.authToken = token;
    req.authPayload = decoded;

    next();
  } catch (err) {
    console.error('auth middleware err:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
