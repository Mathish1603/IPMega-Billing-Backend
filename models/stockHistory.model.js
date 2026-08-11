const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
  date: { type: String, required: true },
  productName: { type: String, required: true },
  productSize: { type: String, default: '' },
  openingStock: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  purchaseQty: { type: Number, default: 0 },
  stockAdded: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  changeReason: { type: String, default: '' }
}, { timestamps: true });

stockHistorySchema.index({ date: 1, productName: 1, productSize: 1 }, { unique: true });

module.exports = mongoose.model('StockHistory', stockHistorySchema);
