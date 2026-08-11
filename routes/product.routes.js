const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, productController.addProduct);
router.get("/", productController.getProducts);
router.get("/active", productController.getActiveProducts);
router.put("/:id", authMiddleware, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
