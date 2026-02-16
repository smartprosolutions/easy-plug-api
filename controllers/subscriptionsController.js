const {
  subscriptions: Subscription,
  sellerSubscription: SellerSubscription,
  listings: Listing,
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
    const { name, durationInHours, description, status, pricingTiers } =
      req.body;

    // Parse pricingTiers if it comes as a string
    let parsedTiers = pricingTiers;
    if (typeof pricingTiers === "string") {
      try {
        parsedTiers = JSON.parse(pricingTiers);
      } catch (e) {
        parsedTiers = [];
      }
    }

    const payload = {
      name,
      durationInHours,
      description,
      status,
      pricingTiers: parsedTiers || [],
    };

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

    const { name, durationInHours, description, status, pricingTiers } =
      req.body;

    // Parse pricingTiers if it comes as a string
    let parsedTiers = pricingTiers;
    if (typeof pricingTiers === "string") {
      try {
        parsedTiers = JSON.parse(pricingTiers);
      } catch (e) {
        parsedTiers = sub.pricingTiers; // keep existing on parse error
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (durationInHours !== undefined)
      updates.durationInHours = durationInHours;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (pricingTiers !== undefined) updates.pricingTiers = parsedTiers;

    await sub.update(updates);
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
  deleteSubscription,
};
