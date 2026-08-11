const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true, trim: true },
  mobileNumber: { type: String, default: "" },
  address: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  email: { type: String, default: "" },
  createdBy: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Supplier", supplierSchema);
