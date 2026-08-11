const User = require('../models/User');
const Sales = require('../models/sales.model');
const Purchase = require('../models/purchase.model');
const Product = require('../models/product.model');
const SalesReturn = require('../models/SalesReturn');
const PurchaseReturn = require('../models/purchaseReturn.model');

// ================= USER MANAGEMENT =================

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.declineUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'declined' }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= ADMIN DASHBOARD =================

exports.getDashboardStats = async (req, res) => {
  try {
    const totalSalesResult = await Sales.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSales = totalSalesResult[0]?.total || 0;

    const totalPurchaseResult = await Purchase.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.netAmount' } } }
    ]);
    const totalPurchase = totalPurchaseResult[0]?.total || 0;

    const totalProducts = await Product.countDocuments();

    const totalInvoices = await Sales.countDocuments();

    // RECENT TRANSACTIONS: flatten items from latest 10 PAID sales only
    const recentSalesRaw = await Sales.find().sort({ createdAt: -1 }).limit(20);
    const recentTransactions = [];
    for (const sale of recentSalesRaw) {
      const paid = Number(sale.receivedAmount || 0);
      const total = Number(sale.totalAmount || 0);
      const due = Number(sale.balanceAmount || 0);
      if (paid === 0 || paid < total) continue;
      for (const item of (sale.items || [])) {
        recentTransactions.push({
          invoiceNo: sale.invoiceNo,
          customerName: sale.customerName,
          productName: item.productName,
          productSize: item.productSize,
          qty: item.qty,
          totalAmount: total,
          paidAmount: paid,
          dueAmount: 0,
          paymentStatus: 'Paid',
          paymentMethod: sale.paymentMethod || '',
          salesPerson: sale.salesPerson || '',
          invoiceDate: sale.invoiceDate
        });
      }
      if (recentTransactions.length >= 10) break;
    }

    res.json({
      success: true,
      data: {
        totalSales,
        totalPurchase,
        totalProducts,
        totalInvoices,
        recentTransactions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= PROFIT CALCULATION (Sales Rate - Purchase Price) =================

exports.getProfit = async (req, res) => {
  try {
    // Build a purchase price map from Product Master: key = productName_productSize
    const allProducts = await Product.find().select('productName productSize purchasePrice').lean();
    const priceMap = {};
    for (const p of allProducts) {
      const key = `${p.productName}_${p.productSize || ''}`;
      priceMap[key] = Number(p.purchasePrice || 0);
    }

    // Helper: calculate profit for a set of sales
    // Profit per unit = Sales Page Rate - Purchase Price
    const calcProfitForSales = async (filter) => {
      const sales = await Sales.find(filter).lean();
      let profit = 0;
      for (const sale of sales) {
        for (const item of (sale.items || [])) {
          const key = `${item.productName}_${item.productSize || ''}`;
          const purchasePrice = priceMap[key] !== undefined ? priceMap[key] : 0;
          const saleRate = Number(item.rate || 0);
          const profitPerUnit = saleRate - purchasePrice;
          profit += profitPerUnit * Number(item.qty || 0);
        }
      }
      return profit;
    };

    // Date ranges
    const now = new Date();

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now); monday.setDate(now.getDate() - diffToMonday); monday.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now); weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now); monthEnd.setHours(23, 59, 59, 999);

    const totalProfit = await calcProfitForSales({});
    const dailyProfit = await calcProfitForSales({ invoiceDate: { $gte: todayStart, $lte: todayEnd } });
    const weeklyProfit = await calcProfitForSales({ invoiceDate: { $gte: monday, $lte: weekEnd } });
    const monthlyProfit = await calcProfitForSales({ invoiceDate: { $gte: monthStart, $lte: monthEnd } });

    res.json({
      success: true,
      data: {
        totalProfit,
        dailyProfit,
        weeklyProfit,
        monthlyProfit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= NOTIFICATIONS =================

exports.getNotifications = async (req, res) => {
  try {
    const pendingUsers = await User.countDocuments({ status: 'pending', role: 'Sales Person' });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySales = await Sales.countDocuments({ invoiceDate: { $gte: todayStart } });

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingUsers,
        todaySales,
        alerts: []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
