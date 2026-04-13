const express = require('express');
const router = express.Router();
const {
  listTransactions,
  createTransaction,
  updateTransactionStatus
} = require('../controllers/transactionsController');
const auth = require('../middleware/auth');

router.get('/', listTransactions);
router.post('/', auth, createTransaction);
router.put('/:id/status', auth, updateTransactionStatus);

module.exports = router;
