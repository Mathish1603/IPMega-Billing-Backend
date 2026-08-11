const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({

  gstType: String,

  partyType: String,

  hsnSac: String,

  supplierName: String,

  supplierId: String,

  supplierEmail: String,

  supplierAddress: String,

  mobileNo: String,

  gstin: String,

  invoiceNo: String,

  invoiceDate: String,

  // BILL TOTALS

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

      amount: Number,

      discountPercent: Number,

      discount: Number,

      gstPercent: Number,

      cgst: Number,

      sgst: Number,

      igst: Number,

      gstAmount: Number,

      netRate: Number,

      netAmount: Number

    }

  ]

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Purchase',
  purchaseSchema
);