const express = require('express');

const router = express.Router();

const OpeningStock = require('../models/openingStockModel');
const Product = require('../models/product.model');
const { rebuildDay, rebuildAllProductsForDate, getDateStr } = require('../helpers/stockHistoryHelper');

router.post('/add-opening-stock', async (req, res) => {

  try {

    const today = new Date().toISOString().split('T')[0];

    // CHECK EXISTING STOCK
    const existingStock = await OpeningStock.findOne({
      productName: req.body.productName,
      productSize: req.body.productSize
    });

    // Update Product Master quantity
    await Product.findOneAndUpdate(
      { productName: req.body.productName, productSize: req.body.productSize },
      { $inc: { quantity: Number(req.body.qty || 0) } }
    );

    // IF ALREADY EXISTS
    if (existingStock) {
      existingStock.qty = Number(existingStock.qty || 0) + Number(req.body.qty || 0);
      existingStock.lastRolloverDate = today;
      await existingStock.save();
      return res.send({ success: true, message: 'Stock Updated' });
    }

    // AUTO DATE (if not provided)
    if (!req.body.stockDate) {
      req.body.stockDate = today;
    }

    // NEW STOCK
    req.body.lastRolloverDate = today;
    const stock = new OpeningStock(req.body);
    await stock.save();

    res.send({ success: true, message: 'Opening Stock Added' });

    rebuildAllProductsForDate(today);
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
});


router.get('/get-opening-stock', async (req, res) => {

    try {

        const data = await OpeningStock.find();

        res.send({

            success: true,

            data

        });

    } catch (error) {

        res.send({

            success: false,

            message: error.message

        });

    }

});




// UPDATE STOCK

router.put('/update-opening-stock/:id', async (req, res) => {

  try {

    const today = new Date().toISOString().split('T')[0];

    const oldStock = await OpeningStock.findById(req.params.id);

    // Reverse old quantity from Product Master
    if (oldStock) {
      await Product.findOneAndUpdate(
        { productName: oldStock.productName, productSize: oldStock.productSize },
        { $inc: { quantity: -Number(oldStock.qty || 0) } }
      );
    }

    req.body.lastRolloverDate = today;

    await OpeningStock.findByIdAndUpdate(

      req.params.id,

      req.body

    );

    // Add new quantity to Product Master
    await Product.findOneAndUpdate(
      { productName: req.body.productName, productSize: req.body.productSize },
      { $inc: { quantity: Number(req.body.qty || 0) } }
    );

    res.send({

      success: true,

      message: 'Updated Successfully'

    });

    rebuildAllProductsForDate(today);

  } catch (error) {

    res.send({

      success: false,

      message: error.message

    });

  }

});


// DELETE STOCK

router.delete('/delete-opening-stock/:id', async (req, res) => {

  try {

    const oldStock = await OpeningStock.findById(req.params.id);

    // Reverse quantity from Product Master
    if (oldStock) {
      await Product.findOneAndUpdate(
        { productName: oldStock.productName, productSize: oldStock.productSize },
        { $inc: { quantity: -Number(oldStock.qty || 0) } }
      );
    }

    await OpeningStock.findByIdAndDelete(req.params.id);

    res.send({

      success: true,

      message: 'Deleted Successfully'

    });

    rebuildAllProductsForDate(getDateStr(new Date()));

  } catch (error) {

    res.send({

      success: false,

      message: error.message

    });

  }

});

module.exports = router;
