const Product = require("../models/product.model");

const Sales = require("../models/sales.model");




exports.getDashboardStock = async (req, res) => {
  try {

    const products = await Product.find({ status: 'Active' }).select('productName productSize quantity');

    res.json({
      success: true,
      data: products.map(p => ({
        productName: p.productName,
        productSize: p.productSize,
        qty: Number(p.quantity || 0)
      }))
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};