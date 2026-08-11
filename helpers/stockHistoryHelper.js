const StockHistory = require('../models/stockHistory.model');
const OpeningStock = require('../models/openingStockModel');
const Product = require('../models/product.model');
const Sales = require('../models/sales.model');
const Purchase = require('../models/purchase.model');

function getDateStr(date) {
  return new Date(date).toISOString().split('T')[0];
}

function getPreviousDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setDate(d.getDate() - 1);
  return getDateStr(d);
}

function getNextDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setDate(d.getDate() + 1);
  return getDateStr(d);
}

async function aggregateSalesForDate(dateStr, productName, productSize) {
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(dateStr + 'T23:59:59.999Z');

  const match = {
    invoiceDate: { $gte: start, $lte: end },
    'items.productName': productName,
  };
  if (productSize) match['items.productSize'] = productSize;

  const result = await Sales.aggregate([
    { $match: { invoiceDate: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    { $match: { 'items.productName': productName, 'items.productSize': productSize } },
    { $group: { _id: null, totalQty: { $sum: '$items.qty' } } },
  ]);

  return result[0]?.totalQty || 0;
}

async function aggregatePurchasesForDate(dateStr, productName, productSize) {
  const result = await Purchase.aggregate([
    { $match: { invoiceDate: dateStr } },
    { $unwind: '$items' },
    { $match: { 'items.productName': productName, 'items.productSize': productSize } },
    { $group: { _id: null, totalQty: { $sum: '$items.qty' } } },
  ]);

  return result[0]?.totalQty || 0;
}

async function rebuildDay(dateStr, productName, productSize) {
  const prevDate = getPreviousDate(dateStr);
  const prevRecord = await StockHistory.findOne({ date: prevDate, productName, productSize });

  let openingStock = 0;
  if (prevRecord) {
    openingStock = prevRecord.currentStock;
  } else {
    const osDoc = await OpeningStock.findOne({ productName, productSize });
    openingStock = osDoc ? Math.max(0, (osDoc.qty || 0)) : 0;
  }

  const totalSales = await aggregateSalesForDate(dateStr, productName, productSize);
  const purchaseQty = await aggregatePurchasesForDate(dateStr, productName, productSize);

  const stockAdded = await getStockAddedForDate(dateStr, productName, productSize);

  const currentStock = Math.max(0, openingStock + stockAdded + purchaseQty - totalSales);

  const reasons = [];
  if (stockAdded > 0) reasons.push('Opening Stock Update');
  if (totalSales > 0) reasons.push('Sale');
  if (purchaseQty > 0) reasons.push('Purchase');
  const changeReason = reasons.join(', ') || 'No Change';

  await StockHistory.findOneAndUpdate(
    { date: dateStr, productName, productSize },
    { date: dateStr, productName, productSize, openingStock, totalSales, purchaseQty, stockAdded, currentStock, changeReason },
    { upsert: true }
  );

  return { openingStock, totalSales, purchaseQty, stockAdded, currentStock, changeReason };
}

async function getStockAddedForDate(dateStr, productName, productSize) {
  const osDoc = await OpeningStock.findOne({ productName, productSize });
  if (!osDoc) return 0;

  if (osDoc.stockDate === dateStr) {
    return Number(osDoc.qty || 0);
  }

  const prevDate = getPreviousDate(dateStr);
  const prevRecord = await StockHistory.findOne({ date: prevDate, productName, productSize });
  const prevStock = prevRecord ? prevRecord.currentStock : 0;

  if (osDoc.lastRolloverDate === dateStr && !prevRecord) {
    return Number(osDoc.qty || 0);
  }

  return 0;
}

async function rebuildAllProductsForDate(dateStr) {
  const products = await Product.find({ status: 'Active' })
    .select('productName productSize')
    .lean();

  for (const p of products) {
    await rebuildDay(dateStr, p.productName, p.productSize);
  }
}

async function rebuildDateAndForward(startDateStr) {
  const today = getDateStr(new Date());
  let currentDate = startDateStr;

  while (currentDate <= today) {
    await rebuildAllProductsForDate(currentDate);
    currentDate = getNextDate(currentDate);
  }
}

module.exports = {
  rebuildDay,
  rebuildAllProductsForDate,
  rebuildDateAndForward,
  getDateStr,
  getPreviousDate,
  getNextDate,
};
