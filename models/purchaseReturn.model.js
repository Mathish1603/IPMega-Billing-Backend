const mongoose = require('mongoose');

const purchaseReturnSchema = new mongoose.Schema({

  returnNo: {
    type: String
  },

  gstType: {
    type: String
  },

  partyType: {
    type: String
  },

  hsnSac: {
    type: String
  },

  returnDate: {
    type: Date,
    default: Date.now
  },

  supplierName: {
    type: String
  },

  mobileNo: {
    type: String
  },

  gstin: {
    type: String
  },

  invoiceNo: {
    type: String
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  paidAmount: {
    type: Number,
    default: 0
  },

  balance: {
    type: Number,
    default: 0
  },

  items: [
    {
      productName: String,

      productSize: String,

      unit: String,

      rate: Number,

      qty: Number,

      gstPercent: Number,

      amount: Number,

      gstAmount: Number,

      total: Number
    }
  ]

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'PurchaseReturn',
  purchaseReturnSchema
);