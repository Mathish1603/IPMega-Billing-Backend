const Customer = require("../models/customer.model");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.addCustomer = async (req, res) => {
  try {
    const name = (req.body.customerName || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    const existing = await Customer.findOne({
      customerName: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") },
    });

    if (existing) {
      return res.json({
        success: true,
        data: existing,
        existing: true,
        message: "Customer already exists",
      });
    }

    const data = { ...req.body, customerName: name, createdBy: req.user?.name || "" };
    const customer = await Customer.create(data);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ customerName: 1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    if (!name) {
      return res.json({ success: true, data: [] });
    }

    const customers = await Customer.find({
      customerName: { $regex: escapeRegex(name), $options: "i" },
    })
      .sort({ customerName: 1 })
      .limit(8);

    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
