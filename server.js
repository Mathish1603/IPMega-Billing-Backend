const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ================= MIDDLEWARE ================= */

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:4200", "https://ip-mega-billing-frontend.vercel.app"];

app.use(cors({
  origin: allowedOrigins, credentials: true
}));
app.use(express.json());

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

/* ================= ROUTES ================= */

const authRoutes = require("./routes/auth.routes");
const salesRoutes = require("./routes/sales.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const openingStockRoutes = require("./routes/openingStockRoutes");
const stockRoutes = require("./routes/stockRoutes");
const salesReturnRoutes = require("./routes/salesReturn.routes");
const purchaseReturnRoutes = require("./routes/purchaseReturn.routes");
const reportsRoutes = require("./routes/reports.routes");
const productRoutes = require("./routes/product.routes");
const adminRoutes = require("./routes/admin.routes");
const stockHistoryRoutes = require("./routes/stockHistory.routes");
const deliveryChallanRoutes = require("./routes/deliveryChallan.routes");
const customerRoutes = require("./routes/customer.routes");
const supplierRoutes = require("./routes/supplier.routes");
const { rebuildDateAndForward, getDateStr } = require("./helpers/stockHistoryHelper");
const { fixExistingGstData } = require("./helpers/gstMigration");

const { authMiddleware, adminOnly } = require("./middleware/auth.middleware");

app.use("/api/auth", authRoutes);
app.use("/api/sales", authMiddleware, salesRoutes);
app.use("/api/purchase", authMiddleware, purchaseRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api", authMiddleware, openingStockRoutes);
app.use("/api", authMiddleware, stockRoutes);
app.use("/api/sales-return", authMiddleware, salesReturnRoutes);
app.use("/api/purchase-return", authMiddleware, purchaseReturnRoutes);
app.use("/api/reports", authMiddleware, reportsRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/admin", authMiddleware, adminOnly, adminRoutes);
app.use("/api", authMiddleware, stockHistoryRoutes);
app.use("/api/delivery-challans", authMiddleware, deliveryChallanRoutes);
app.use("/api/customers", authMiddleware, customerRoutes);
app.use("/api/suppliers", authMiddleware, supplierRoutes);

/* ================= DATABASE ================= */

mongoose.connect(process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/ipmegaBilling")
  .then(() => {
    console.log("MongoDB Connected Successfully");
    rebuildDateAndForward(getDateStr(new Date())).catch(() => { });
    fixExistingGstData().catch(() => { });
  })
  .catch((err) => console.error("MongoDB Connection Failed:", err));

/* ================= DEFAULT ROUTE ================= */

app.get("/", (req, res) => {
  res.send("IPMega Billing Backend Running");
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});
