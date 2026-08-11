const Product = require("../models/product.model");
const { isZeroGstSize, isStandardGstSize } = require("../helpers/gstHelper");

const applyGstRule = (data) => {
  if (isZeroGstSize(data.productSize)) {
    data.gstPercent = 0;
  } else if (isStandardGstSize(data.productSize)) {
    data.gstPercent = 5;
  }
};

exports.addProduct = async (req, res) => {
  try {
    delete req.body.addedBy;
    applyGstRule(req.body);
    const data = { ...req.body, addedBy: req.user.name || '' };
    const product = await Product.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActiveProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' }).sort({ productName: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    delete req.body.addedBy;
    applyGstRule(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
