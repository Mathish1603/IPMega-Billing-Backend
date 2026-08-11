const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");

router.get("/daily-sales", reportsController.getDailySales);
router.get("/weekly-sales", reportsController.getWeeklySales);
router.get("/monthly-sales", reportsController.getMonthlySales);
router.get("/filtered-sales", reportsController.getFilteredSales);

module.exports = router;
