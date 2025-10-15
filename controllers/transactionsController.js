const { transactions: Transaction } = require('../models');

async function listTransactions(req, res, next) {
  try { const items = await Transaction.findAll(); return res.json({ success: true, transactions: items }); } catch (err) { next(err); }
}

module.exports = { listTransactions };
