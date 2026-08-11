const Purchase = require("../models/purchase.model");
const OpeningStock = require("../models/openingStockModel");
const Product = require("../models/product.model");
const { rebuildDay, rebuildDateAndForward, getDateStr } = require("../helpers/stockHistoryHelper");
const { isZeroGstSize } = require("../helpers/gstHelper");

// 26 KG items must always be saved with 0% GST
const normalizePurchaseItems = (items) => {
  items.forEach((item) => {
    if (isZeroGstSize(item.productSize)) {
      const rate = Number(item.rate || 0);
      const qty = Number(item.qty || 0);
      const amount = rate * qty;
      const discountPercent = Number(item.discountPercent || 0);
      const discount = (amount * discountPercent) / 100;
      const afterDiscount = amount - discount;

      item.gstPercent = 0;
      item.cgst = 0;
      item.sgst = 0;
      item.igst = 0;
      item.gstAmount = 0;
      item.amount = amount;
      item.discount = discount;
      item.netAmount = afterDiscount;
      item.netRate = qty > 0 ? afterDiscount / qty : 0;
    }
  });
  return items;
};

const recomputePurchaseTotals = (body) => {
  if (Array.isArray(body.items)) {
    const total = body.items.reduce((sum, it) => sum + Number(it.netAmount || 0), 0);
    body.totalAmount = total;
    body.balance = total - Number(body.paidAmount || 0);
  }
};

async function rebuildStockForDate(dateStr) {
  try {
    const products = await Product.find({ status: 'Active' }).select('productName productSize').lean();
    for (const p of products) {
      await rebuildDay(dateStr, p.productName, p.productSize);
    }
  } catch (e) { /* silent */ }
}

// ================= ADD PURCHASE =================
exports.addPurchase = async (req, res) => {
  try {
    if (Array.isArray(req.body.items)) {
      normalizePurchaseItems(req.body.items);
      recomputePurchaseTotals(req.body);
    }

    const purchase = new Purchase(req.body);

    console.log("🔥 PURCHASE REQUEST:", req.body);

    await purchase.save();

    console.log("ITEMS RECEIVED:", req.body.items);

    for (const item of req.body.items) {
      const result = await OpeningStock.findOneAndUpdate(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: {
            qty: Number(item.qty || 0),
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log("UPDATED STOCK:", result);

      // Also update Product Master quantity
      await Product.findOneAndUpdate(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: Number(item.qty || 0) } }
      );
    }

    res.status(201).json({
      message: "Purchase Added & Stock Updated",
      purchase,
    });

    const pDate = purchase.invoiceDate || getDateStr(new Date());
    rebuildStockForDate(pDate);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error",
      error,
    });
  }
};

// ================= GET ALL PURCHASES =================
exports.getPurchase = async (req, res) => {
  try {
    const search = req.params.search;

    console.log(" SEARCH:", search);

    const purchase = await Purchase.findOne({
      $or: [
        { invoiceNo: search },
        { mobileNo: search },
        { supplierName: search }
      ]
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase Not Found"
      });
    }

    res.json(purchase);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ================= DELETE PURCHASE =================
exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        message: "Purchase Not Found"
      });
    }

    for (const item of purchase.items) {
      await OpeningStock.findOneAndUpdate(
        {
          productName: item.productName,
          productSize: item.productSize
        },
        {
          $inc: {
            qty: -Number(item.qty)
          }
        }
      );

      // Also reverse in Product Master
      await Product.findOneAndUpdate(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: -Number(item.qty || 0) } }
      );
    }

    await Purchase.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Purchase Deleted Successfully"
    });

    const pDate = purchase.invoiceDate || getDateStr(new Date());
    rebuildStockForDate(pDate);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ================= UPDATE PURCHASE =================
exports.updatePurchase = async (req, res) => {
  try {
    const oldPurchase = await Purchase.findById(req.params.id);

    if (!oldPurchase) {
      return res.status(404).json({
        message: "Purchase Not Found"
      });
    }

    // REMOVE OLD STOCK
    for (const item of oldPurchase.items) {
      await OpeningStock.findOneAndUpdate(
        {
          productName: item.productName,
          productSize: item.productSize
        },
        {
          $inc: { qty: -Number(item.qty) }
        }
      );

      // Also reverse in Product Master
      await Product.findOneAndUpdate(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: -Number(item.qty || 0) } }
      );
    }

    // ADD NEW STOCK
    for (const item of req.body.items) {
      await OpeningStock.findOneAndUpdate(
        {
          productName: item.productName,
          productSize: item.productSize
        },
        {
          $inc: { qty: Number(item.qty) }
        },
        { upsert: true }
      );

      // Also update Product Master
      await Product.findOneAndUpdate(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: Number(item.qty || 0) } }
      );
    }

    if (Array.isArray(req.body.items)) {
      normalizePurchaseItems(req.body.items);
      recomputePurchaseTotals(req.body);
    }

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(purchase);

    (async () => {
      const oldDate = oldPurchase.invoiceDate || getDateStr(new Date());
      const newDate = req.body.invoiceDate || oldDate;
      await rebuildStockForDate(oldDate);
      if (oldDate !== newDate) await rebuildStockForDate(newDate);
    })();

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};


exports.updatePayment = async (req, res) => {
  try {
    const { paidAmount, balance, paymentMethod } = req.body;

    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        paidAmount,
        balance,
        paymentMethod
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Payment Updated",
      data: updated
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};