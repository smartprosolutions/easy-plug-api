const express = require('express');
const router = express.Router();
const { listSellerSubscriptions, getSellerSubscription } = require('../controllers/sellerSubscriptionController');

router.get('/', listSellerSubscriptions);
router.get('/:id', getSellerSubscription);

module.exports = router;
