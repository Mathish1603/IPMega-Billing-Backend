const express = require("express");
const router = express.Router();

const salesController = require("../controllers/sales.controller");

/* =========================
   SALES ROUTES
========================= */

/* CREATE SALES */
router.post("/add", salesController.addSales);

/* RECEIVE PAYMENT (IMPORTANT - MUST BE ABOVE :id) */
router.put("/receive-payment", salesController.receivePayment);

/* GENERATE INVOICE */
router.get("/generate-invoice", salesController.generateInvoice);

/* FILTER BY DATE */
router.get("/filter/date", salesController.getSalesByDate);

/* GET ALL SALES */
router.get("/", salesController.getSales);

/* GET SINGLE SALE */
router.get("/:id", salesController.getSingleSale);

/* UPDATE SALE */
router.put("/:id", salesController.updateSale);

/* DELETE SALE */
router.delete("/:id", salesController.deleteSale);

module.exports = router;