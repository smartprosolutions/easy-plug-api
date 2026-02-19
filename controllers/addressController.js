const { address: Address } = require("../models");

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

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

    const payload = { ...req.body, userId };

    // always create a new address record for the user
    const addr = await Address.create(payload);
    return res.status(201).json({ success: true, address: addr });
  } catch (err) {
    next(err);
  }
}

// create address for browser user (unprotected)
async function createAddressByBrowser(req, res, next) {
  try {
    const { browserId, ...rest } = req.body || {};

    if (!browserId)
      return res
        .status(400)
        .json({ success: false, message: "browserId is required" });

    if (!isUuid(browserId))
      return res.status(400).json({
        success: false,
        message: "browserId must be a valid UUID",
      });

    const payload = { ...rest, userId: browserId };
    const addr = await Address.create(payload);

    return res.status(201).json({ success: true, address: addr });
  } catch (err) {
    next(err);
  }
}

// get current user's address
async function getMyAddress(req, res, next) {
  try {
    const { limit } = req.query || {};
    const userId = req.user && req.user.id;

    if (String(limit) === "1") {
      const addr = await Address.findOne({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });
      return res.json({ success: true, address: addr });
    }

    const addresses = await Address.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
    return res.json({ success: true, addresses });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAddresses,
  createAddress,
  createAddressByBrowser,
  getMyAddress,
};
