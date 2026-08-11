const express = require('express');
const router = express.Router();
const StockHistory = require('../models/stockHistory.model');
const { rebuildDateAndForward, rebuildAllProductsForDate, getDateStr } = require('../helpers/stockHistoryHelper');

router.get('/stock-history', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const data = await StockHistory.find(filter).sort({ date: -1, productName: 1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rebuild-history', async (req, res) => {
  try {
    const { date } = req.body;
    const dateStr = date || getDateStr(new Date());
    await rebuildDateAndForward(dateStr);
    res.json({ success: true, message: 'Stock history rebuilt' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
