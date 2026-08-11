const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    req.userData = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const salesPersonOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role.toLowerCase() !== 'sales person') {
      return res.status(403).json({ success: false, message: 'Access denied. Sales Person only.' });
    }
    req.userData = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { authMiddleware, adminOnly, salesPersonOnly };
