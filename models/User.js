const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Sales Person'],
    default: 'Sales Person'
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'declined'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
