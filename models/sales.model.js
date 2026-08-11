const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({



receivedAmount: {
  type: Number,
  default: 0
},

balanceAmount: {
  type: Number,
  default: 0
},

paymentStatus: {
  type: String,
  default: 'Due'
},

  gstType: {
    type: String
  },

  customerId: {
    type: String
  },

  customerEmail: {
    type: String
  },

  partyType: {
    type: String
  },

  stockPlace: {
    type: String
  },

customerName: {
  type: String,
  required: true
},

customerAddress: {
  type: String,
  required: true
},

state: {
  type: String,
  required: true
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

   salesPerson: {
    type: String
  },

  items: [

    {
      productName: String,

      productSize: String,

      unit: String,

      rate: Number,

      qty: Number,

      amount: Number,

      cgst: Number,

      sgst: Number,

      igst: Number,

      netAmount: Number,
      
    }

  ],

  subtotal: {
    type: Number
  },

  gst: {
    type: Number
  },

  totalAmount: {
    type: Number
  },

  invoiceDate: {

    type: Date,

    required: true,
     default: Date.now

  }

});

module.exports = mongoose.model('Sales', salesSchema);