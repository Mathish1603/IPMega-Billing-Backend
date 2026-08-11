const mongoose = require('mongoose');

const openingStockSchema = new mongoose.Schema({

    productName: String,

    productSize: String,

    qty: Number,

    rate: Number,

    stockDate: String,

    lastRolloverDate: String

});

module.exports = mongoose.model(
    'openingstock',
    openingStockSchema
);