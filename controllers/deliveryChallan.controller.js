const DeliveryChallan = require('../models/deliveryChallan.model');

exports.getNextChallanNo = async (req, res) => {
  try {
    const last = await DeliveryChallan.findOne().sort({ createdAt: -1 });
    let nextNo = 1;
    if (last && last.challanNo) {
      let match = last.challanNo.match(/IPMDC-(\d+)/);
      if (!match) match = last.challanNo.match(/DC-(\d+)/);
      if (match) nextNo = parseInt(match[1]) + 1;
    }
    const formatted = 'IPMDC-' + String(nextNo).padStart(6, '0');
    res.json({ success: true, nextNo: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const challan = new DeliveryChallan({ ...req.body, createdBy: req.user?.name || '' });
    await challan.save();
    res.status(201).json({ success: true, data: challan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await DeliveryChallan.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await DeliveryChallan.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = await DeliveryChallan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const data = await DeliveryChallan.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
