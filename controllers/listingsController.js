const db = require("../models");
const {
  listings: Listing,
  users: User,
  sellerSubscription: SellerSubscription,
  subscriptions: Subscription,
  address: Address
} = db;
const { Op } = require("sequelize");
const { fail } = require("../utils/response");
const path = require("path");
const fs = require("fs");

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function listListings(req, res, next) {
  try {
    // require authenticated user so we can return listings the user has not seen
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    // fetch candidate listings (not seen)
    const candidates = await Listing.findAll({
      where: { [Op.or]: [{ isSeen: false }, { isSeen: null }] },
      include: [
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] },
          include: [
            {
              model: Address,
              attributes: [
                "addressId",
                "latitude",
                "longitude",
                "streetNumber",
                "streetName",
                "suburb",
                "city",
                "province",
                "country",
                "postalCode",
                "createdAt"
              ],
              separate: true,
              limit: 1,
              order: [["createdAt", "DESC"]]
            }
          ]
        },
        {
          model: SellerSubscription,
          attributes: ["sellerSubscriptionId", "subscriptionId"],
          include: [
            {
              model: Subscription,
              attributes: [
                "subscriptionId",
                "name",
                "durationInHours",
                "price",
                "status"
              ]
            }
          ]
        }
      ]
    });

    const filtered = candidates;

    // split into ads and standard, newest first
    const ads = filtered
      .filter((l) => !!l.isAdvertisement)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const standard = filtered
      .filter((l) => !l.isAdvertisement)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // pagination pattern per page: 8 ads, 24 standard, 8 ads
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const adOffset = (page - 1) * 16; // 8 top + 8 bottom per page
    const stdOffset = (page - 1) * 24;

    const topAds = ads.slice(adOffset, adOffset + 8);
    const stdItems = standard.slice(stdOffset, stdOffset + 24);
    const bottomAds = ads.slice(adOffset + 8, adOffset + 16);

    const pageListings = [...topAds, ...stdItems, ...bottomAds];

    return res.json({
      success: true,
      listings: pageListings,
      page,
      counts: {
        adsTotal: ads.length,
        standardTotal: standard.length
      }
    });
  } catch (err) {
    next(err);
  }
}

// Ads: list only advertisements, 8 per page
async function listAdListings(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 8;
    const offset = (page - 1) * pageSize;

    const { rows, count } = await Listing.findAndCountAll({
      where: {
        isAdvertisement: true,
        [Op.or]: [{ isSeen: false }, { isSeen: null }]
      },
      include: [
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] },
          include: [
            {
              model: Address,
              attributes: [
                "addressId",
                "latitude",
                "longitude",
                "streetNumber",
                "streetName",
                "suburb",
                "city",
                "province",
                "country",
                "postalCode",
                "createdAt"
              ],
              separate: true,
              limit: 1,
              order: [["createdAt", "DESC"]]
            }
          ]
        },
        {
          model: SellerSubscription,
          attributes: ["sellerSubscriptionId", "subscriptionId"],
          include: [
            {
              model: Subscription,
              attributes: [
                "subscriptionId",
                "name",
                "durationInHours",
                "price",
                "status"
              ]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset
    });

    return res.json({
      success: true,
      listings: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (err) {
    next(err);
  }
}

// Standard: list only non-advertisements, 16 per page
async function listStandardListings(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 16;
    const offset = (page - 1) * pageSize;

    const { rows, count } = await Listing.findAndCountAll({
      where: {
        isAdvertisement: { [Op.or]: [false, null] },
        [Op.or]: [{ isSeen: false }, { isSeen: null }]
      },
      include: [
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] },
          include: [
            {
              model: Address,
              attributes: [
                "addressId",
                "latitude",
                "longitude",
                "streetNumber",
                "streetName",
                "suburb",
                "city",
                "province",
                "country",
                "postalCode",
                "createdAt"
              ],
              separate: true,
              limit: 1,
              order: [["createdAt", "DESC"]]
            }
          ]
        },
        {
          model: SellerSubscription,
          attributes: ["sellerSubscriptionId", "subscriptionId"],
          include: [
            {
              model: Subscription,
              attributes: [
                "subscriptionId",
                "name",
                "durationInHours",
                "price",
                "status"
              ]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset
    });

    return res.json({
      success: true,
      listings: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (err) {
    next(err);
  }
}

// Admin: list all listings (no filters)
async function adminListListings(req, res, next) {
  try {
    const items = await Listing.findAll();
    return res.json({ success: true, listings: items });
  } catch (err) {
    next(err);
  }
}

// Seller: list listings for the authenticated seller
async function sellerListListings(req, res, next) {
  try {
    const sellerId = req.user && req.user.id;
    if (!sellerId) return fail(res, "User not authenticated", 401);
    const items = await Listing.findAll({ where: { sellerId } });
    return res.json({ success: true, listings: items });
  } catch (err) {
    next(err);
  }
}

async function getListing(req, res, next) {
  try {
    const { id } = req.params;
    const item = await Listing.findByPk(id, {
      include: [
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] }
        },
        {
          model: SellerSubscription,
          attributes: ["sellerSubscriptionId", "subscriptionId"],
          include: [
            {
              model: Subscription,
              attributes: [
                "subscriptionId",
                "name",
                "durationInHours",
                "price",
                "status"
              ]
            }
          ]
        }
      ]
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    // Attach the latest address for the seller (uploader)
    if (item.sellerId) {
      const latestAddress = await Address.findOne({
        where: { userId: item.sellerId },
        order: [["createdAt", "DESC"]]
      });
      if (latestAddress) {
        item.dataValues.address = latestAddress;
      }
    }

    return res.json({ success: true, listing: item });
  } catch (err) {
    next(err);
  }
}

async function createListing(req, res, next) {
  try {
    console.log("Request body:", req.body); // Debugging line
    console.log("Request files:", req.files); // Debugging line
    const sequelize = db.sequelize;
    const { subscriptionId } = req.body || {};
    const payload = { ...req.body };
    // ensure sellerId is present (from body or auth)
    if (!payload.sellerId && req.user && req.user.id)
      payload.sellerId = req.user.id;

    // prepare file storage and seller/subscription info
    const uploadedFiles = [];

    // resolve seller email for folder naming (use authenticated user's email if available)
    const sellerEmail = req.user && req.user.email;

    // resolve subscription name and set isAdvertisement flag
    let subscriptionName = "none";
    let foundSubscription = null;
    if (subscriptionId) {
      foundSubscription = await db.subscriptions.findByPk(subscriptionId);
      if (!foundSubscription) {
        const err = new Error("Subscription not found");
        err.status = 400;
        throw err;
      }
      subscriptionName = (
        foundSubscription.name || `sub-${subscriptionId}`
      ).replace(/[^a-z0-9-_]/gi, "_");

      // if subscription is Standard => not an advertisement, otherwise advertisement
      const subName = (foundSubscription.name || "").toLowerCase();
      if (subName === "standard") payload.isAdvertisement = false;
      else payload.isAdvertisement = true;
    }

    // handle uploaded files (express-fileupload)
    if (req.files) {
      const allFiles = [];
      if (req.files.images) {
        if (Array.isArray(req.files.images)) allFiles.push(...req.files.images);
        else allFiles.push(req.files.images);
      }
      if (req.files.file) allFiles.push(req.files.file);

      if (allFiles.length > 0) {
        const destDir = path.join(
          process.cwd(),
          "uploads",
          "listings",
          sellerEmail,
          subscriptionName
        );
        fs.mkdirSync(destDir, { recursive: true });

        for (const f of allFiles) {
          const safeName = `${Date.now()}-${f.name.replace(
            /[^a-z0-9.\-_]/gi,
            "_"
          )}`;
          const destPath = path.join(destDir, safeName);
          await new Promise((resolve, reject) => {
            f.mv(destPath, (err) => (err ? reject(err) : resolve()));
          });
          // only store the filename in the DB; files are saved on disk under
          // uploads/listings/<sellerEmail>/<subscriptionName>/<safeName>
          uploadedFiles.push(safeName);
        }

        if (uploadedFiles.length > 0) payload.images = uploadedFiles;
      }
    }

    // run a transaction so listing creation and sellerSubscription creation are atomic
    try {
      const result = await sequelize.transaction(async (t) => {
        const created = await Listing.create(payload, { transaction: t });

        let sellerSub = null;
        if (subscriptionId) {
          // validate subscription exists (in-transaction)
          const subscription = await db.subscriptions.findByPk(subscriptionId, {
            transaction: t
          });
          if (!subscription) {
            const err = new Error("Subscription not found");
            err.status = 400;
            throw err;
          }

          // create sellerSubscription linking this listing
          sellerSub = await db.sellerSubscription.create(
            {
              sellerId: created.sellerId,
              listingId: created.listingId,
              subscriptionId: subscription.subscriptionId || subscriptionId
            },
            { transaction: t }
          );
        }

        return { listing: created, sellerSubscription: sellerSub };
      });

      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      // cleanup uploaded files on failure
      try {
        for (const fileName of uploadedFiles) {
          const p = path.join(
            process.cwd(),
            "uploads",
            "listings",
            sellerEmail,
            subscriptionName,
            fileName
          );
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } catch (cleanupErr) {
        console.error(
          "Error cleaning uploaded files after transaction failure:",
          cleanupErr
        );
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const item = await Listing.findByPk(id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    await item.update(req.body);
    return res.json({ success: true, listing: item });
  } catch (err) {
    next(err);
  }
}

async function deleteListing(req, res, next) {
  try {
    const { id } = req.params;
    const item = await Listing.findByPk(id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    await item.destroy();
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listListings,
  listAdListings,
  listStandardListings,
  adminListListings,
  sellerListListings,
  getListing,
  createListing,
  updateListing,
  deleteListing
};
