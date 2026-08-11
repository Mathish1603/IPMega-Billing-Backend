const Supplier = require("../models/supplier.model");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.addSupplier = async (req, res) => {
  try {
    const name = (req.body.supplierName || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Supplier name is required" });
    }

    const existing = await Supplier.findOne({
      supplierName: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") },
    });

    if (existing) {
      return res.json({
        success: true,
        data: existing,
        existing: true,
        message: "Supplier already exists",
      });
    }

    const data = { ...req.body, supplierName: name, createdBy: req.user?.name || "" };
    const supplier = await Supplier.create(data);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ supplierName: 1 });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.searchSuppliers = async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    if (!name) {
      return res.json({ success: true, data: [] });
    }

    const suppliers = await Supplier.find({
      supplierName: { $regex: escapeRegex(name), $options: "i" },
    })
      .sort({ supplierName: 1 })
      .limit(8);

    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
