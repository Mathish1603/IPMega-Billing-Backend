const Product = require("../models/product.model");
const Sales = require("../models/sales.model");
const Purchase = require("../models/purchase.model");
const { isZeroGstSize } = require("./gstHelper");

// Updates existing 26 KG products, sales and purchases so they never carry 5% GST.
// Idempotent - safe to run on every server startup.
async function fixExistingGstData() {
  // 1) Products: 26 KG → gstPercent 0
  const products = await Product.find({});
  for (const p of products) {
    if (isZeroGstSize(p.productSize) && Number(p.gstPercent || 0) !== 0) {
      await Product.updateOne({ _id: p._id }, { $set: { gstPercent: 0 } });
    }
  }

  // 2) Sales: 26 KG items → 0% GST; recompute sale-level gst for any sale
  //    containing a 26 KG item (so stale sale.gst is always corrected).
  const sales = await Sales.find({});
  for (const sale of sales) {
    const items = sale.items || [];
    const hasZeroGstItem = items.some((item) => isZeroGstSize(item.productSize));
    if (!hasZeroGstItem) continue;

    let changed = false;

    for (const item of items) {
      if (isZeroGstSize(item.productSize)) {
        const amount = Number(item.rate || 0) * Number(item.qty || 0);

        if (
          Number(item.gstPercent || 0) !== 0 ||
          Number(item.cgst || 0) !== 0 ||
          Number(item.sgst || 0) !== 0 ||
          Number(item.igst || 0) !== 0 ||
          Number(item.netAmount || 0) !== amount
        ) {
          item.gstPercent = 0;
          item.cgst = 0;
          item.sgst = 0;
          item.igst = 0;
          item.amount = amount;
          item.netAmount = amount;
          changed = true;
        }
      }
    }

    const computedGst = items.reduce(
      (sum, it) =>
        sum +
        (Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0)) *
          Number(it.qty || 1),
      0
    );

    if (changed || Number(sale.gst || 0) !== computedGst) {
      sale.gst = computedGst;
      await sale.save();
    }
  }

  // 3) Purchases: 26 KG items → 0% GST, recompute item net totals and
  //    purchase totalAmount / balance.
  const purchases = await Purchase.find({});
  for (const purchase of purchases) {
    const items = purchase.items || [];
    const hasZeroGstItem = items.some((item) => isZeroGstSize(item.productSize));
    if (!hasZeroGstItem) continue;

    let changed = false;

    for (const item of items) {
      if (isZeroGstSize(item.productSize)) {
        const rate = Number(item.rate || 0);
        const qty = Number(item.qty || 0);
        const amount = rate * qty;
        const discountPercent = Number(item.discountPercent || 0);
        const discount = (amount * discountPercent) / 100;
        const afterDiscount = amount - discount;

        if (
          Number(item.gstPercent || 0) !== 0 ||
          Number(item.gstAmount || 0) !== 0 ||
          Number(item.cgst || 0) !== 0 ||
          Number(item.sgst || 0) !== 0 ||
          Number(item.igst || 0) !== 0 ||
          Number(item.netAmount || 0) !== afterDiscount
        ) {
          item.gstPercent = 0;
          item.cgst = 0;
          item.sgst = 0;
          item.igst = 0;
          item.gstAmount = 0;
          item.amount = amount;
          item.discount = discount;
          item.netAmount = afterDiscount;
          item.netRate = qty > 0 ? afterDiscount / qty : 0;
          changed = true;
        }
      }
    }

    if (changed) {
      const total = items.reduce((sum, it) => sum + Number(it.netAmount || 0), 0);
      purchase.totalAmount = total;
      purchase.balance = total - Number(purchase.paidAmount || 0);
      await purchase.save();
    }
  }
}

module.exports = { fixExistingGstData };
