const mongoose = require("mongoose");

const salesReturnSchema = new mongoose.Schema({
  invoiceNo: String,

  customerName: String,

  mobileNo: String,

  totalAmount: Number,

  paidAmount: Number,

  returnAmount: Number,

  refundPaid: Number,

  refundBalance: Number,

  products: [
    {
      productName: String,
      size: String,
      unit: String,
      rate: Number,
      soldQty: Number,
      returnQty: Number,
      amount: Number,
      total: Number
    }
  ],

  returnDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "SalesReturn",
  salesReturnSchema
);