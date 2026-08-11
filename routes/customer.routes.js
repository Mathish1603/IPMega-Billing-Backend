const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");

router.post("/", customerController.addCustomer);
router.get("/search", customerController.searchCustomers);
router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomerById);

module.exports = router;
