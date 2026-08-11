const mongoose = require('mongoose');

const deliveryChallanSchema = new mongoose.Schema({
  challanNo: { type: String, required: true, unique: true },
  challanDate: { type: String, required: true },
  deliveryDate: { type: String, default: '' },

  vehicleNumber: { type: String, default: '' },
  transporterName: { type: String, default: '' },
  driverName: { type: String, default: '' },
  driverMobile: { type: String, default: '' },
  ewayBillNo: { type: String, default: '' },
  purposeOfDelivery: { type: String, default: '' },

  companyName: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyGstin: { type: String, default: '' },
  companyMobile: { type: String, default: '' },

  customerName: { type: String, default: '' },
  customerMobile: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  customerGstin: { type: String, default: '' },

  items: [
    {
      productName: { type: String, default: '' },
      productSize: { type: String, default: '' },
      qty: { type: Number, default: 0 },
      unit: { type: String, default: '' },
      remarks: { type: String, default: '' }
    }
  ],

  createdBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
