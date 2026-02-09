const {
  subscriptions: Subscription,
  sellerSubscription: SellerSubscription,
  listings: Listing
} = require("../models");

async function listSubscriptions(req, res, next) {
  try {
    const subs = await Subscription.findAll({
      // include: [
      //   {
      //     model: SellerSubscription,
      //     include: [{ model: Listing }]
      //   }
      // ]
    });
    return res.json({ success: true, subscriptions: subs });
  } catch (err) {
    next(err);
  }
}

async function getSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findByPk(id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const payload = req.body;
    const created = await Subscription.create(payload);
    return res.status(201).json({ success: true, subscription: created });
  } catch (err) {
    next(err);
  }
}

async function updateSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findByPk(id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    await sub.update(req.body);
    return res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

async function deleteSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findByPk(id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    await sub.destroy();
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription
};
