const { sellerSubscription: SellerSubscription } = require('../models');

async function listSellerSubscriptions(req, res, next) {
  try {
    const items = await SellerSubscription.findAll();
    return res.json({ success: true, sellerSubscriptions: items });
  } catch (err) { next(err); }
}

async function getSellerSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const item = await SellerSubscription.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, sellerSubscription: item });
  } catch (err) { next(err); }
}

module.exports = { listSellerSubscriptions, getSellerSubscription };
