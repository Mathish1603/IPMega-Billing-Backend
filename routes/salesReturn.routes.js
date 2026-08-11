const express = require("express");
const Sales = require("../models/sales.model");
const router = express.Router();

const salesReturnController = require("../controllers/salesReturn.controller");

router.get(
    "/GetInvoice/:invoiceNo",
    salesReturnController.getInvoice
);

router.post(
    "/save-return",
    salesReturnController.saveReturn
);

router.delete(
    "/delete-return/:id",
    salesReturnController.deleteReturn
);

router.put(
  "/update-return/:id",
  salesReturnController.updateReturn
);



module.exports = router;