const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  mobileNumber: { type: String, default: "" },
  address: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  email: { type: String, default: "" },
  createdBy: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
