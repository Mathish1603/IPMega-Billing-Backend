const router = require("express").Router();

const Product = require("../models/product.model");

router.get("/dashboard-stock", async (req, res) => {
  try {
    const stockData = await Product.find({ status: 'Active' })
      .select('productName productSize quantity')
      .sort({ productName: 1, productSize: 1 });

    res.json({
      success: true,
      data: stockData.map(p => ({
        productName: p.productName,
        productSize: p.productSize,
        qty: p.quantity || 0
      })),
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;