const express = require('express');
const router = express.Router();
const { listPayments, createPayment, payfastNotify, payfastReturn, payfastCancel } = require('../controllers/paymentsController');
const auth = require('../middleware/auth');

router.get('/', listPayments);
router.post('/create', auth, createPayment); // create payment for a transaction (authenticated)
router.post('/payfast/notify', express.urlencoded({ extended: true }), payfastNotify); // PayFast IPN
router.get('/payfast/return', payfastReturn);
router.get('/payfast/cancel', payfastCancel);

module.exports = router;
