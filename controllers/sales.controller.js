const Sales = require("../models/sales.model");
const OpeningStock = require("../models/openingStockModel");
const Product = require("../models/product.model");
const { rebuildDay, rebuildDateAndForward, getDateStr } = require("../helpers/stockHistoryHelper");
const { isZeroGstSize } = require("../helpers/gstHelper");

// 26 KG items must always be saved with 0% GST
const normalizeSalesItems = (items) => {
  items.forEach((item) => {
    if (isZeroGstSize(item.productSize)) {
      const amount = Number(item.rate || 0) * Number(item.qty || 0);
      item.gstPercent = 0;
      item.cgst = 0;
      item.sgst = 0;
      item.igst = 0;
      item.amount = amount;
      item.netAmount = amount;
    }
  });
  return items;
};

const computeSaleGst = (items) => {
  return items.reduce((sum, item) => {
    const qty = Number(item.qty || 1);
    return sum + (Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0)) * qty;
  }, 0);
};

const generateInvoiceNumber = async () => {
  const now = new Date();

  // YEAR
  const year = now.getFullYear().toString().slice(-2);

  // MONTH CODE
  const monthCodes = [
    "A", // JAN
    "B", // FEB
    "C", // MAR
    "D", // APR
    "E", // MAY
    "F", // JUN
    "G", // JUL
    "H", // AUG
    "I", // SEP
    "J", // OCT
    "K", // NOV
    "L", // DEC
  ];

  const monthCode = monthCodes[now.getMonth()];

  // PREFIX
  const prefix = `IPMC${year}${monthCode}`;

  // LAST INVOICE
  const lastSale = await Sales.findOne({
    invoiceNo: {
      $regex: `^${prefix}`,
    },
  })

    .sort({ invoiceNo: -1 });

  // START NUMBER
  let serial = 221001;

  // NEXT NUMBER
  if (lastSale && lastSale.invoiceNo) {
    const lastNumber = parseInt(lastSale.invoiceNo.slice(-6));

    serial = lastNumber + 1;
  }

  return `${prefix}${serial}`;
};

// ================= NORMALIZE FUNCTION =================

const normalize = (value) => {
  return value.toString().toLowerCase().replace(/\s+/g, "");
};

// ================= GET ALL SALES =================

exports.getSales = async (req, res) => {
  try {
    const { date } = req.query;

    let filter = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.invoiceDate = {
        $gte: start,
        $lte: end,
      };
    }

    const data = await Sales.find(filter);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching sales",
      error: err.message,
    });
  }
};

// ================= GET SINGLE SALE =================

exports.getSingleSale = async (req, res) => {
  try {
    const data = await Sales.findById(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Sales not found",
      });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching sale",

      error: err.message,
    });
  }
};

// ================= DELETE SALE =================

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        message: "Sales not found",
      });
    }

    // RESTORE STOCK IN PRODUCT MASTER
    for (const item of sale.items) {
      await Product.updateOne(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: { quantity: Number(item.qty || 0) },
        }
      );
    }

    await Sales.findByIdAndDelete(req.params.id);

    const dateStr = sale.invoiceDate ? getDateStr(sale.invoiceDate) : getDateStr(new Date());
    (async () => {
      const products = await Product.find({ status: 'Active' }).select('productName productSize').lean();
      for (const p of products) {
        await rebuildDay(dateStr, p.productName, p.productSize);
      }
    })();

    res.status(200).json({
      message: "Sales deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting sale",
      error: err.message,
    });
  }
};

// ======================================================================================
exports.generateInvoice = async (req, res) => {
  try {
    const now = new Date();

    const year = now.getFullYear().toString().slice(-2);

    const monthCodes = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
    ];

    const monthCode = monthCodes[now.getMonth()];

    const day = String(now.getDate()).padStart(2, "0");

    const partyType = req.query.partyType;

    let partyCode = "C";

    if (partyType === "Business") {
      partyCode = "B";
    }

    const searchPrefix = `IPM${partyCode}${year}${monthCode}`;

    // Fetch ALL sales with this prefix from MongoDB (always fresh)
    const allSales = await Sales.find({
      invoiceNo: { $regex: `^${searchPrefix}` },
    }).select('invoiceNo');

    // Extract and sort all serial numbers
    const serials = allSales
      .map(s => parseInt(s.invoiceNo.slice(-4), 10))
      .sort((a, b) => a - b);

    // Find the first gap starting from 1001
    let serial = 1001;
    for (const s of serials) {
      if (s === serial) {
        serial++;
      } else if (s > serial) {
        break;
      }
    }

    const invoiceNo = `${searchPrefix}${day}${String(serial).padStart(4, "0")}`;

    res.status(200).json({
      success: true,
      invoiceNo,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= SAVE SALES =================
exports.addSales = async (req, res) => {
  try {
    const data = req.body;

    if (!data || !Array.isArray(data.items)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sales data",
      });
    }

    // ================= STOCK CHECK AGAINST PRODUCT MASTER =================
    for (const item of data.items) {
      const product = await Product.findOne({
        productName: item.productName,
        productSize: item.productSize,
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productName}`,
        });
      }

      if ((product.quantity || 0) < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.productName}. Available: ${product.quantity || 0}`,
        });
      }
    }

    // ================= NORMALIZE GST (26 KG → 0%) =================
    normalizeSalesItems(data.items);
    data.gst = computeSaleGst(data.items);

    // ================= SAVE SALE =================
    const sale = await Sales.create(data);

    // ================= REDUCE STOCK IN PRODUCT MASTER =================
    for (const item of data.items) {
      await Product.updateOne(
        {
          productName: item.productName,
          productSize: item.productSize,
        },
        {
          $inc: { quantity: -Number(item.qty || 0) },
        }
      );
    }

    rebuildStockHistoryForSale(sale);

    return res.status(200).json({
      success: true,
      saleId: sale._id,
    });

  } catch (err) {
    console.log("ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

async function rebuildStockHistoryForSale(sale) {
  try {
    const dateStr = sale.invoiceDate ? getDateStr(sale.invoiceDate) : getDateStr(new Date());
    const products = await Product.find({ status: 'Active' }).select('productName productSize').lean();
    for (const p of products) {
      await rebuildDay(dateStr, p.productName, p.productSize);
    }
  } catch (e) { /* silent */ }
}
// ================= FILTER SALES =================

exports.getSalesByDate = async (req, res) => {
  try {
    let { from, to } = req.query;

    from = new Date(from);

    from.setHours(0, 0, 0, 0);

    to = new Date(to);

    to.setHours(23, 59, 59, 999);

    const data = await Sales.find({
      invoiceDate: {
        $gte: from,

        $lte: to,
      },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.receivePayment = async (req, res) => {
  try {
    const { saleId, paidAmount, balanceAmount, paymentStatus } = req.body;

    const sale = await Sales.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    sale.receivedAmount = (sale.receivedAmount || 0) + Number(paidAmount);

    sale.balanceAmount = balanceAmount;

    sale.paymentStatus = paymentStatus;

    await sale.save();

    res.json({
      success: true,
      data: sale,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= UPDATE SALE =================

exports.updateSale = async (req, res) => {
  try {
    const oldSale = await Sales.findById(req.params.id);
    if (!oldSale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const data = req.body;
    if (!data || !Array.isArray(data.items)) {
      return res.status(400).json({ success: false, message: "Invalid sales data" });
    }

    // RESTORE OLD STOCK
    for (const item of oldSale.items) {
      await Product.updateOne(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: Number(item.qty || 0) } }
      );
    }

    // CHECK NEW STOCK
    for (const item of data.items) {
      const product = await Product.findOne({
        productName: item.productName,
        productSize: item.productSize,
      });
      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.productName}` });
      }
      if ((product.quantity || 0) < item.qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.productName}. Available: ${product.quantity || 0}` });
      }
    }

    // ================= NORMALIZE GST (26 KG → 0%) =================
    normalizeSalesItems(data.items);
    data.gst = computeSaleGst(data.items);

    // UPDATE SALE
    const updated = await Sales.findByIdAndUpdate(
      req.params.id,
      { ...data, _id: req.params.id },
      { new: true }
    );

    // REDUCE NEW STOCK
    for (const item of data.items) {
      await Product.updateOne(
        { productName: item.productName, productSize: item.productSize },
        { $inc: { quantity: -Number(item.qty || 0) } }
      );
    }

    const oldDateStr = oldSale.invoiceDate ? getDateStr(oldSale.invoiceDate) : getDateStr(new Date());
    const newDateStr = updated.invoiceDate ? getDateStr(updated.invoiceDate) : getDateStr(new Date());
    (async () => {
      const products = await Product.find({ status: 'Active' }).select('productName productSize').lean();
      for (const p of products) {
        await rebuildDay(oldDateStr, p.productName, p.productSize);
        if (oldDateStr !== newDateStr) {
          await rebuildDay(newDateStr, p.productName, p.productSize);
        }
      }
    })();

    return res.status(200).json({ success: true, saleId: updated._id });
  } catch (err) {
    console.log("UPDATE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
