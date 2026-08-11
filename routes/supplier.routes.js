const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplier.controller");

router.post("/", supplierController.addSupplier);
router.get("/search", supplierController.searchSuppliers);
router.get("/", supplierController.getSuppliers);
router.get("/:id", supplierController.getSupplierById);

module.exports = router;
