const express = require("express");

const router = express.Router();

const OpeningStock = require("../models/openingStockModel");
const Product = require("../models/product.model");
const Purchase = require("../models/purchase.model");

const Sales = require("../models/sales.model");
const PurchaseReturn = require("../models/purchaseReturn.model");
const SalesReturn = require("../models/SalesReturn");

router.post("/check-stock", async (req, res) => {
  try {
    const { productName, productSize } = req.body;

    const product = await Product.findOne({
      productName,
      productSize
    }).select('quantity').lean();

    const currentStock = (product?.quantity || 0) < 0 ? 0 : (product?.quantity || 0);

    res.send({
      success: true,
      currentStock,
      breakdown: {
        source: "Product Master"
      }
    });

  } catch (error) {
    res.send({
      success: false,
      message: error.message
    });
  }
});

/* ================= DASHBOARD STOCK ================= */
router.get("/dashboard-stock", async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' })
      .select('productName productSize quantity')
      .lean();

    const stockData = products.map(item => ({
      productName: item.productName,
      productSize: item.productSize,
      qty: (item.quantity || 0) < 0 ? 0 : (item.quantity || 0)
    }));

    res.json({
      success: true,
      data: stockData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/dashboard-purchase-total", async (req, res) => {
  try {

    const openingResult = await OpeningStock.aggregate([
      {
        $group: {
          _id: null,
          totalOpeningAmount: {
            $sum: { $multiply: ["$qty", "$rate"] }
          }
        }
      }
    ]);

    const purchaseResult = await Purchase.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalPurchaseAmount: {
            $sum: "$items.netAmount"
          }
        }
      }
    ]);

    // 🔥 ADD PURCHASE RETURN
    const returnResult = await PurchaseReturn.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalReturnAmount: {
            $sum: "$items.netAmount"
          }
        }
      }
    ]);

    const openingAmount =
      Math.abs(openingResult[0]?.totalOpeningAmount || 0);

    const purchaseAmount =
      purchaseResult[0]?.totalPurchaseAmount || 0;

    const returnAmount =
      returnResult[0]?.totalReturnAmount || 0;

    // 🔥 FINAL CALCULATION
    const totalPurchaseAmount =
      openingAmount + purchaseAmount - returnAmount;

    res.send({
      success: true,
      openingAmount,
      purchaseAmount,
      returnAmount,
      totalPurchaseAmount
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

/* ================= DAILY STOCK VIEW ================= */
router.get("/stock-daily", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get all active products
    const products = await Product.find({ status: "Active" })
      .select("productName productSize")
      .lean();

    // Get all opening stock records
    const openingStocks = await OpeningStock.find().lean();
    const stockMap = {};
    openingStocks.forEach((s) => {
      const key = s.productName + "_" + s.productSize;
      stockMap[key] = s;
    });

    // Aggregate today's sales by product
    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd = new Date(today + "T23:59:59.999Z");

    const todaySalesAgg = await Sales.aggregate([
      { $match: { invoiceDate: { $gte: todayStart, $lte: todayEnd } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productName: "$items.productName",
            productSize: "$items.productSize",
          },
          totalQty: { $sum: "$items.qty" },
        },
      },
    ]);

    const todaySalesMap = {};
    todaySalesAgg.forEach((s) => {
      const key = s._id.productName + "_" + s._id.productSize;
      todaySalesMap[key] = s.totalQty;
    });

    // Perform rollover for each product if needed
    const result = [];

    for (const product of products) {
      const key = product.productName + "_" + product.productSize;
      const stockRecord = stockMap[key];

      let openingQty = 0;

      if (stockRecord) {
        const lastRollover = stockRecord.lastRolloverDate || "";

        if (lastRollover && lastRollover < today) {
          // Rollover: subtract all sales from lastRolloverDate to yesterday
          const from = new Date(lastRollover + "T00:00:00.000Z");
          const to = new Date(today + "T00:00:00.000Z");
          to.setDate(to.getDate() - 1);
          to.setHours(23, 59, 59, 999);

          const pastSalesAgg = await Sales.aggregate([
            { $match: { invoiceDate: { $gte: from, $lte: to } } },
            { $unwind: "$items" },
            {
              $match: {
                "items.productName": product.productName,
                "items.productSize": product.productSize,
              },
            },
            {
              $group: {
                _id: null,
                totalQty: { $sum: "$items.qty" },
              },
            },
          ]);

          const pastSales = pastSalesAgg[0]?.totalQty || 0;

          // Update qty in DB
          const newQty = Math.max(0, (stockRecord.qty || 0) - pastSales);
          await OpeningStock.updateOne(
            { _id: stockRecord._id },
            { $set: { qty: newQty, lastRolloverDate: today } }
          );

          openingQty = newQty;
        } else {
          openingQty = stockRecord.qty || 0;
        }
      }

      const totalSales = todaySalesMap[key] || 0;
      const currentStock = Math.max(0, openingQty - totalSales);

      result.push({
        _id: stockRecord ? stockRecord._id : null,
        productName: product.productName,
        productSize: product.productSize,
        openingStock: openingQty,
        totalSales,
        currentStock,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
