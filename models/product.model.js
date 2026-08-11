const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  category: { type: String, default: '' },
  productSize: { type: String, default: '' },
  unit: { type: String, default: 'KG' },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 5 },
  quantity: { type: Number, default: 0 },
  addedBy: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
