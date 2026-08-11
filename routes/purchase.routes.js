const express = require("express");
const router = express.Router();

const Purchase = require("../models/purchase.model");
const Product = require("../models/product.model");
const OpeningStock = require("../models/openingStockModel");

const { updatePayment } = require("../controllers/purchase.controller");

const {
  deletePurchase,
  updatePurchase,
} = require("../controllers/purchase.controller");

router.put("/payment/:id", updatePayment);

router.post("/", async (req, res) => {
  try {
    const purchase = new Purchase(req.body);

    await purchase.save();

    for (const item of req.body.items) {
      // Update OpeningStock
      const stock = await OpeningStock.findOne({
        productName: item.productName,
        productSize: item.productSize,
      });

      if (stock) {
        stock.qty += Number(item.qty);
        await stock.save();
      } else {
        await OpeningStock.create({
          productName: item.productName,
          productSize: item.productSize,
          qty: Number(item.qty),
          rate: item.rate || 0,
          stockDate: new Date().toISOString().split("T")[0],
        });
      }

      // Update Product Master quantity
      await Product.findOneAndUpdate(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: Number(item.qty || 0) } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Purchase Saved",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/invoice/:invoiceNo", async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      invoiceNo: req.params.invoiceNo,
    });

    if (!purchase) {
      return res.status(404).json({
        message: "Invoice Not Found",
      });
    }

    res.json(purchase);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Purchase By GRN No
router.get("/next-grn", async (req, res) => {
  try {
    const lastPurchase = await Purchase.findOne().sort({ createdAt: -1 });

    let nextNo = 1001;

    if (lastPurchase && lastPurchase.grnNo) {
      const lastRunningNo = parseInt(lastPurchase.grnNo.slice(-4));

      nextNo = lastRunningNo + 1;
    }

    res.json({
      nextNo,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", deletePurchase);

router.put("/:id", updatePurchase);

router.get("/search/:search", async (req, res) => {
  try {
    const search = req.params.search;

    const purchase = await Purchase.findOne({
      $or: [
        { invoiceNo: search },
        { supplierName: search },
        { mobileNo: search }
      ]
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase Not Found"
      });
    }

    res.json({
      success: true,
      ...purchase.toObject()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;