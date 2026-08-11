const PurchaseReturn = require("../models/purchaseReturn.model");

const Purchase = require("../models/purchase.model");

const OpeningStock = require("../models/openingStockModel");

const Product = require("../models/product.model");

// NEXT RETURN NO

exports.getNextReturnNo = async (req, res) => {
  try {
    const lastRecord = await PurchaseReturn.findOne().sort({ createdAt: -1 });

    let nextNo = 1001;

    if (lastRecord && lastRecord.returnNo) {
      nextNo = Number(lastRecord.returnNo) + 1;
    }

    return res.json({
      returnNo: nextNo.toString(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// SEARCH PURCHASE

exports.getPurchase = async (req, res) => {
  try {
    const search = (req.params.search || "").trim();

    const purchase = await Purchase.findOne({
      $or: [
        { invoiceNo: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
      ],
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase Not Found",
      });
    }

    //  GET RETURN DATA
    const PurchaseReturn = require("../models/purchaseReturn.model");

    const returns = await PurchaseReturn.find({
      invoiceNo: purchase.invoiceNo,
    });

    //  CREATE RETURN MAP
    const returnMap = {};

    returns.forEach((r) => {
      r.items.forEach((it) => {
        const key = it.productName + "_" + it.productSize;
        returnMap[key] = (returnMap[key] || 0) + (it.returnQty || 0);
      });
    });

    //  ADJUST ITEMS
    const updatedItems = (purchase.items || []).map((item) => {
      const key = item.productName + "_" + item.productSize;

      const returnedQty = returnMap[key] || 0;

      return {
        ...item,
        returnQty: returnedQty,
        availableQty: (item.qty || 0) - returnedQty,
      };
    });

    return res.json({
      success: true,
      gstType: purchase.gstType,
      partyType: purchase.partyType,
      hsnSac: purchase.hsnSac,
      supplierName: purchase.supplierName,
      mobileNo: purchase.mobileNo,
      gstin: purchase.gstin,
      invoiceNo: purchase.invoiceNo,
      invoiceDate: purchase.invoiceDate,
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      balance: purchase.balance,
      items: updatedItems,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// SAVE PURCHASE RETURN

exports.savePurchaseReturn = async (req, res) => {
  try {
    const items = req.body.items;

    //  VALIDATION
    for (const item of items) {
      if (item.returnQty > item.qty) {
        return res.status(400).json({
          message: `Return qty cannot exceed available stock for ${item.productName}`,
        });
      }
    }

    const PurchaseReturn = require("../models/purchaseReturn.model");
    const OpeningStock = require("../models/openingStockModel"); //  ADD THIS

    //  SAVE RETURN FIRST
    const returnData = new PurchaseReturn(req.body);
    await returnData.save();

    //  UPDATE STOCK (IMPORTANT PART)
    for (const item of req.body.items) {
      // 1. update stock
      await OpeningStock.updateOne(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: { qty: -item.returnQty },
        },
      );

      // 2. update purchase qty
      await Purchase.updateOne(
        {
          invoiceNo: req.body.invoiceNo,
          "items.productName": item.productName,
          "items.productSize": item.productSize,
        },
        {
          $inc: { "items.$.qty": -item.returnQty },
        },
      );

      // 3. update Product Master quantity
      await Product.updateOne(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: { quantity: -Number(item.returnQty || 0) },
        },
      );
    }

    res.status(201).json({
      success: true,
      message: "Purchase Return Saved Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// GET ALL RETURNS

exports.getAllReturns = async (req, res) => {
  try {
    const data = await PurchaseReturn.find().sort({ createdAt: -1 });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE RETURN

exports.deleteReturn = async (req, res) => {
  try {
    const record = await PurchaseReturn.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record Not Found",
      });
    }

    // STOCK REVERSE

    for (const item of record.items) {
      const stock = await OpeningStock.findOne({
        productName: item.productName,
        productSize: item.productSize,
      });

      if (stock) {
        stock.qty = Number(stock.qty || 0) + Number(item.returnQty || 0);
        await stock.save();
      }

      // Also reverse in Product Master
      await Product.updateOne(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: { quantity: Number(item.returnQty || 0) },
        },
      );

      // Reverse the purchase items qty decrement
      await Purchase.updateOne(
        {
          invoiceNo: record.invoiceNo,
          "items.productName": item.productName,
          "items.productSize": item.productSize,
        },
        {
          $inc: { "items.$.qty": Number(item.returnQty || 0) },
        }
      );
    }

    await PurchaseReturn.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,

      message: "Purchase Return Deleted Successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,

      message: err.message,
    });
  }
};
