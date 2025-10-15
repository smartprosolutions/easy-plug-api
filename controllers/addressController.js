const { address: Address } = require("../models");

async function listAddresses(req, res, next) {
  try {
    const items = await Address.findAll();
    return res.json({ success: true, addresses: items });
  } catch (err) {
    next(err);
  }
}

// create or update address for authenticated user
async function createAddress(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });

    const payload = { ...req.body, userId };

    // always create a new address record for the user
    const addr = await Address.create(payload);
    return res.status(201).json({ success: true, address: addr });
  } catch (err) {
    next(err);
  }
}

// get current user's address
async function getMyAddress(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
  // return the most recent address for the user
  const addr = await Address.findOne({ where: { userId }, order: [['createdAt', 'DESC']] });
  return res.json({ success: true, address: addr });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAddresses, createAddress, getMyAddress };
