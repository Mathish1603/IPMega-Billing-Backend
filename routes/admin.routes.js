const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

router.get("/users", adminController.getUsers);
router.put("/users/:id/approve", adminController.approveUser);
router.put("/users/:id/decline", adminController.declineUser);
router.get("/dashboard", adminController.getDashboardStats);
router.get("/profit", adminController.getProfit);
router.get("/notifications", adminController.getNotifications);

module.exports = router;
