const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER (always Sales Person, status=pending)
exports.register = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      mobile,
      email,
      password: hashedPassword,
      role: 'Sales Person',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: loginId },
        { mobile: loginId },
        { name: loginId }
      ]
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid Credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is waiting for admin approval.' });
    }

    if (user.status === 'declined') {
      return res.status(403).json({ success: false, message: 'Your account has been declined.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'ipmega_default_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
