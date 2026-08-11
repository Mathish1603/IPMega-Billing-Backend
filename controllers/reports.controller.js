const Sales = require("../models/sales.model");

// ================= DAILY SALES REPORT =================

exports.getDailySales = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const result = await Sales.aggregate([
      {
        $match: {
          invoiceDate: { $gte: start, $lte: end },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalSalesAmount: { $sum: "$totalAmount" },
                totalInvoices: { $sum: 1 },
                totalGst: { $sum: "$gst" },
                totalQuantity: { $sum: { $sum: "$items.qty" } },
              },
            },
          ],
          products: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { productName: "$items.productName", productSize: "$items.productSize" },
                qty: { $sum: "$items.qty" },
                amount: { $sum: "$items.amount" },
              },
            },
            { $sort: { qty: -1 } },
          ],
          sales: [{ $sort: { invoiceDate: -1 } }],
        },
      },
    ]);

    const data = result[0];
    const summary = data.summary[0] || { totalSalesAmount: 0, totalInvoices: 0, totalGst: 0, totalQuantity: 0 };

    res.json({
      success: true,
      date: start.toISOString().split("T")[0],
      totalSalesAmount: summary.totalSalesAmount,
      totalInvoices: summary.totalInvoices,
      totalQuantity: summary.totalQuantity,
      totalGst: summary.totalGst,
      totalProducts: data.products.length,
      products: data.products,
      sales: data.sales,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= WEEKLY SALES REPORT =================

exports.getWeeklySales = async (req, res) => {
  try {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const result = await Sales.aggregate([
      {
        $match: {
          invoiceDate: { $gte: monday, $lte: periodEnd },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalSalesAmount: { $sum: "$totalAmount" },
                totalInvoices: { $sum: 1 },
                totalQuantity: { $sum: { $sum: "$items.qty" } },
                totalGst: { $sum: "$gst" },
              },
            },
          ],
          daily: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" },
                },
                amount: { $sum: "$totalAmount" },
                count: { $sum: 1 },
                qty: { $sum: { $sum: "$items.qty" } },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const data = result[0];
    const summary = data.summary[0] || { totalSalesAmount: 0, totalInvoices: 0, totalQuantity: 0, totalGst: 0 };

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const dailyMap = {};
    data.daily.forEach((d) => {
      dailyMap[d._id] = { amount: d.amount, count: d.count, qty: d.qty };
    });

    const todayIndex = day === 0 ? 6 : day - 1;
    const weekDays = [];
    for (let i = 0; i <= todayIndex; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().split("T")[0];
      weekDays.push({
        date: key,
        day: dayNames[i],
        amount: dailyMap[key]?.amount || 0,
        count: dailyMap[key]?.count || 0,
        qty: dailyMap[key]?.qty || 0,
      });
    }

    res.json({
      success: true,
      weekStart: monday.toISOString().split("T")[0],
      weekEnd: periodEnd.toISOString().split("T")[0],
      totalSalesAmount: summary.totalSalesAmount,
      totalInvoices: summary.totalInvoices,
      totalQuantity: summary.totalQuantity,
      totalGst: summary.totalGst,
      weekDays,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= FILTERED SALES REPORT =================

exports.getFilteredSales = async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: "from and to query params required" });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const result = await Sales.aggregate([
      {
        $match: {
          invoiceDate: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalSalesAmount: { $sum: "$totalAmount" },
                totalInvoices: { $sum: 1 },
                totalGst: { $sum: "$gst" },
                totalQuantity: { $sum: { $sum: "$items.qty" } },
              },
            },
          ],
          products: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { productName: "$items.productName", productSize: "$items.productSize" },
                qty: { $sum: "$items.qty" },
                amount: { $sum: "$items.amount" },
              },
            },
            { $sort: { qty: -1 } },
          ],
          sales: [
            { $sort: { invoiceDate: -1 } },
            {
              $project: {
                invoiceNo: 1,
                customerName: 1,
                totalAmount: 1,
                gst: 1,
                subtotal: 1,
                paymentStatus: 1,
                invoiceDate: 1,
                items: 1,
              },
            },
          ],
        },
      },
    ]);

    const data = result[0];
    const summary = data.summary[0] || { totalSalesAmount: 0, totalInvoices: 0, totalGst: 0, totalQuantity: 0 };

    res.json({
      success: true,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totalSalesAmount: summary.totalSalesAmount,
      totalInvoices: summary.totalInvoices,
      totalQuantity: summary.totalQuantity,
      totalGst: summary.totalGst,
      totalProducts: data.products.length,
      products: data.products,
      sales: data.sales,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= MONTHLY SALES REPORT =================

exports.getMonthlySales = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const currentMonthResult = await Sales.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startOfMonth, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$totalAmount" },
          totalInvoices: { $sum: 1 },
          totalQuantity: { $sum: { $sum: "$items.qty" } },
          totalGst: { $sum: "$gst" },
        },
      },
    ]);

    const currentMonth = currentMonthResult[0] || { totalSalesAmount: 0, totalInvoices: 0, totalQuantity: 0, totalGst: 0 };

    // GET ALL MONTHS WITH SALES (for trend)
    const allMonths = await Sales.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          totalSalesAmount: { $sum: "$totalAmount" },
          totalInvoices: { $sum: 1 },
          totalQuantity: { $sum: { $sum: "$items.qty" } },
          totalGst: { $sum: "$gst" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const monthlyTrend = allMonths.map((m) => ({
      month: m._id.month,
      year: m._id.year,
      label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      totalSalesAmount: m.totalSalesAmount,
      totalInvoices: m.totalInvoices,
      totalQuantity: m.totalQuantity,
      totalGst: m.totalGst,
    }));

    // CALCULATE GROWTH vs SAME PERIOD PREV MONTH (1st to same day)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    prevStart.setHours(0, 0, 0, 0);

    const sameDayPrev = new Date(prevStart.getFullYear(), prevStart.getMonth(), now.getDate(), 23, 59, 59, 999);

    const prevMonthResult = await Sales.aggregate([
      {
        $match: {
          invoiceDate: { $gte: prevStart, $lte: sameDayPrev },
        },
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const prevAmount = prevMonthResult[0]?.totalSalesAmount || 0;
    let growthPercent = 0;
    if (prevAmount > 0) {
      growthPercent = ((currentMonth.totalSalesAmount - prevAmount) / prevAmount) * 100;
    }

    res.json({
      success: true,
      monthStart: startOfMonth.toISOString().split("T")[0],
      monthEnd: periodEnd.toISOString().split("T")[0],
      currentMonth: {
        label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
        totalSalesAmount: currentMonth.totalSalesAmount,
        totalInvoices: currentMonth.totalInvoices,
        totalQuantity: currentMonth.totalQuantity,
        totalGst: currentMonth.totalGst,
      },
      growthPercent: Math.round(growthPercent * 100) / 100,
      monthlyTrend,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
