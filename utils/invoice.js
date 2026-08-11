const Sales = require('../models/sales.model');

exports.generateInvoiceNo = async () => {

  const lastInvoice = await Sales.findOne()
    .sort({ createdAt: -1 });

  let number = 1;

  if (lastInvoice && lastInvoice.invoiceNo) {
    const lastNo = lastInvoice.invoiceNo.split('IPMC')[1];
    number = parseInt(lastNo) + 1;
  }

  return `IPMC${String(number).padStart(6, '0')}`;
};