const express = require('express');

const router = express.Router();

const purchaseReturnController =
require('../controllers/purchaseReturn.controller');

router.get(
  '/next-return-no',
  purchaseReturnController.getNextReturnNo
);

router.get(
  '/search/:search',
  purchaseReturnController.getPurchase
);

router.post(
  '/save',
  purchaseReturnController.savePurchaseReturn
);

router.get(
  '/',
  purchaseReturnController.getAllReturns
);

router.delete(
  '/:id',
  purchaseReturnController.deleteReturn
);

module.exports = router;