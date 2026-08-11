const Sales =
require('../models/sales.model');

const OpeningStock =
require('../models/openingStockModel');
const SalesReturn = require('../models/SalesReturn');
const Product = require('../models/product.model');
// =====================================
// GET INVOICE
// =====================================
exports.getInvoice = async (req, res) => {
  try {

    const key = (req.params.invoiceNo || "").trim();

    const sales = await Sales.findOne({
      $or: [
        {
          invoiceNo: {
            $regex: key,
            $options: "i"
          }
        },
        {
          customerName: {
            $regex: key,
            $options: "i"
          }
        },
        {
          mobileNo: key
        }
      ]
    });

    if (!sales) {
      return res.status(404).json({
        success: false,
        message: "Invoice Not Found"
      });
    }

    const returns = await SalesReturn.find({
      invoiceNo: sales.invoiceNo
    });

    let totalReturnAmount = 0;
    let totalRefundPaid = 0;

    returns.forEach((r) => {
      totalReturnAmount += Number(r.returnAmount || 0);
      totalRefundPaid += Number(r.refundPaid || 0);
    });

    const refundBalance =
      totalReturnAmount - totalRefundPaid;

    // SOLD QTY - RETURNED QTY

    const products = sales.items.map((item) => {

      let returnedQty = 0;

      returns.forEach((ret) => {

        if (ret.products) {

          ret.products.forEach((p) => {

            if (
              p.productName === item.productName &&
              p.size === item.productSize
            ) {
              returnedQty += Number(
                p.returnQty || 0
              );
            }

          });

        }

      });

      return {
        productName: item.productName,
        productSize: item.productSize,
        unit: item.unit,
        rate: item.rate,

        qty:
          Number(item.qty || 0) -
          Number(returnedQty || 0),

        amount:
          (Number(item.qty || 0) -
            Number(returnedQty || 0)) *
          Number(item.rate || 0),

        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,

        netAmount:
          (Number(item.qty || 0) -
            Number(returnedQty || 0)) *
          Number(item.rate || 0)
      };

    });

    return res.status(200).json({
      success: true,

      invoiceNo: sales.invoiceNo,
      invoiceDate: sales.invoiceDate,

      customerName: sales.customerName,
      mobileNo: sales.mobileNo,
      gstin: sales.gstin,

      products: products,

      subtotal: sales.subtotal,

      totalAmount: sales.totalAmount,

      paidAmount:
        sales.receivedAmount || 0,

      balanceAmount:
        sales.balanceAmount || 0,

      totalReturnAmount,
      totalRefundPaid,
      refundBalance,

      returns
    });

  } catch (err) {

    console.error(
      "GET INVOICE ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};
// =====================================
// SAVE RETURN + UPDATE STOCK
// =====================================

exports.saveReturn = async (req, res) => {
  try {

    const {
      invoiceNo,
      customerName,
      mobileNo,
      totalAmount,
      paidAmount,
      returnAmount,
      refundPaid,
      products
    } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No return products found"
      });
    }

    const refundBalance =
      Number(returnAmount || 0) -
      Number(refundPaid || 0);

    // Save Return Entry

    const returnEntry = await SalesReturn.create({
      invoiceNo,
      customerName,
      mobileNo,
      totalAmount,
      paidAmount,
      returnAmount,
      refundPaid,
      refundBalance,
      products
    });

    // Update Opening Stock

    for (const item of products) {

      const stock = await OpeningStock.findOne({
        productName: item.productName,
        productSize: item.size
      });

      if (stock) {

        stock.qty =
          Number(stock.qty || 0) +
          Number(item.returnQty || 0);

        await stock.save();

      } else {

        console.log(
          "Stock Not Found:",
          item.productName,
          item.size
        );

      }

      // Also update Product Master quantity
      await Product.updateOne(
        {
          productName: item.productName,
          productSize: item.size
        },
        {
          $inc: { quantity: Number(item.returnQty || 0) }
        }
      );
    }

    // Optional Sales Update

    await Sales.updateOne(
      { invoiceNo: invoiceNo },
      {
        $inc: {
          returnAmount: Number(returnAmount || 0)
        }
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Sales Return Saved & Stock Updated Successfully",
      data: returnEntry
    });

  } catch (err) {

    console.error(
      "SAVE RETURN ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


// ======================
// DELETE RETURN

exports.deleteReturn = async (req, res) => {
  try {
    const returnData = await SalesReturn.findById(req.params.id);

    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: "Return not found"
      });
    }

    // Reverse Stock — remove stock that was added back during return
    for (const item of returnData.products) {
      await OpeningStock.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { qty: -Number(item.returnQty || 0) } }
      );

      // Also reverse in Product Master
      await Product.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { quantity: -Number(item.returnQty || 0) } }
      );
    }

    // Reverse Sales
    await Sales.updateOne(
      { invoiceNo: returnData.invoiceNo },
      { $inc: { returnAmount: -returnData.returnAmount } }
    );

    await SalesReturn.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Sales Return Deleted Successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.updateReturn = async (req, res) => {
  try {
    const oldReturn = await SalesReturn.findById(req.params.id);

    if (!oldReturn) {
      return res.status(404).json({ message: "Not found" });
    }

    // STEP 1: Reverse old values — remove old return stock
    for (const item of oldReturn.products) {
      await OpeningStock.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { qty: -Number(item.returnQty || 0) } }
      );

      // Also reverse in Product Master
      await Product.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { quantity: -Number(item.returnQty || 0) } }
      );
    }

    await Sales.updateOne(
      { invoiceNo: oldReturn.invoiceNo },
      { $inc: { returnAmount: -oldReturn.returnAmount } }
    );

    // STEP 2: Apply new values
    const refundBalance = req.body.returnAmount - req.body.refundPaid;

    const updated = await SalesReturn.findByIdAndUpdate(
      req.params.id,
      { ...req.body, refundBalance },
      { new: true }
    );

    for (const item of req.body.products) {
      await OpeningStock.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { qty: Number(item.returnQty || 0) } }
      );

      // Also update Product Master
      await Product.updateOne(
        { productName: item.productName, productSize: item.size },
        { $inc: { quantity: Number(item.returnQty || 0) } }
      );
    }

    await Sales.updateOne(
      { invoiceNo: req.body.invoiceNo },
      { $inc: { returnAmount: req.body.returnAmount } }
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};