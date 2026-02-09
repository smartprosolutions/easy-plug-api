const db = require("../models");
const {
  listings: Listing,
  users: User,
  sellerSubscription: SellerSubscription,
  subscriptions: Subscription,
  address: Address,
  ratings: Rating,
  wishlist: Wishlist,
  priceHistory: PriceHistory
} = db;
const { Op } = require("sequelize");
const { fail } = require("../utils/response");
const { logActivity } = require("../middleware/activityLogger");
const { createNotification } = require("./notificationsController");
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

    // Get optional location parameters for proximity sorting
    const { latitude, longitude, maxDistance } = req.query;
    const userLat = latitude ? parseFloat(latitude) : null;
    const userLon = longitude ? parseFloat(longitude) : null;
    const maxDist = maxDistance ? parseFloat(maxDistance) : null;

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

    let filtered = candidates;

    // Calculate distances and filter by maxDistance if location provided
    if (userLat !== null && userLon !== null) {
      filtered = filtered.map(listing => {
        if (listing.seller && listing.seller.addresses && listing.seller.addresses.length > 0) {
          const sellerAddr = listing.seller.addresses[0];
          if (sellerAddr.latitude && sellerAddr.longitude) {
            const distance = haversineDistanceKm(
              userLat,
              userLon,
              parseFloat(sellerAddr.latitude),
              parseFloat(sellerAddr.longitude)
            );
            listing.dataValues.distance = Math.round(distance * 10) / 10;
            return listing;
          }
        }
        listing.dataValues.distance = null;
        return listing;
      });

      // Filter by maxDistance if specified
      if (maxDist !== null) {
        filtered = filtered.filter(l => l.dataValues.distance !== null && l.dataValues.distance <= maxDist);
      }
    }

    // split into ads and standard
    let ads = filtered.filter((l) => !!l.isAdvertisement);
    let standard = filtered.filter((l) => !l.isAdvertisement);

    // Sort by distance if location provided, otherwise by date
    if (userLat !== null && userLon !== null) {
      ads = ads.sort((a, b) => {
        const distA = a.dataValues.distance !== null ? a.dataValues.distance : Infinity;
        const distB = b.dataValues.distance !== null ? b.dataValues.distance : Infinity;
        return distA - distB;
      });
      standard = standard.sort((a, b) => {
        const distA = a.dataValues.distance !== null ? a.dataValues.distance : Infinity;
        const distB = b.dataValues.distance !== null ? b.dataValues.distance : Infinity;
        return distA - distB;
      });
    } else {
      // Default sort by newest first
      ads = ads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      standard = standard.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

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
      },
      location: userLat && userLon ? {
        latitude: userLat,
        longitude: userLon,
        maxDistance: maxDist,
        sortedByDistance: true
      } : null
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

    // Get optional location parameters for proximity sorting
    const { latitude, longitude, maxDistance } = req.query;
    const userLat = latitude ? parseFloat(latitude) : null;
    const userLon = longitude ? parseFloat(longitude) : null;
    const maxDist = maxDistance ? parseFloat(maxDistance) : null;

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 8;

    // Fetch all matching listings (we'll sort and paginate in memory if using location)
    const fetchAll = userLat !== null && userLon !== null;
    const offset = fetchAll ? 0 : (page - 1) * pageSize;
    const limit = fetchAll ? undefined : pageSize;

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
      order: userLat === null ? [["createdAt", "DESC"]] : [],
      limit,
      offset,
      distinct: true
    });

    let listings = rows;
    let totalCount = count;

    // Calculate distances and sort by proximity if location provided
    if (userLat !== null && userLon !== null) {
      listings = listings.map(listing => {
        if (listing.seller && listing.seller.addresses && listing.seller.addresses.length > 0) {
          const sellerAddr = listing.seller.addresses[0];
          if (sellerAddr.latitude && sellerAddr.longitude) {
            const distance = haversineDistanceKm(
              userLat,
              userLon,
              parseFloat(sellerAddr.latitude),
              parseFloat(sellerAddr.longitude)
            );
            listing.dataValues.distance = Math.round(distance * 10) / 10;
            return listing;
          }
        }
        listing.dataValues.distance = null;
        return listing;
      });

      // Filter by maxDistance if specified
      if (maxDist !== null) {
        listings = listings.filter(l => l.dataValues.distance !== null && l.dataValues.distance <= maxDist);
        totalCount = listings.length;
      }

      // Sort by distance (nearest first)
      listings.sort((a, b) => {
        const distA = a.dataValues.distance !== null ? a.dataValues.distance : Infinity;
        const distB = b.dataValues.distance !== null ? b.dataValues.distance : Infinity;
        return distA - distB;
      });

      // Paginate in memory
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      listings = listings.slice(start, end);
    }

    return res.json({
      success: true,
      listings,
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      location: userLat && userLon ? {
        latitude: userLat,
        longitude: userLon,
        maxDistance: maxDist,
        sortedByDistance: true
      } : null
    });
  } catch (err) {
    next(err);
  }
}

// Standard: list only non-advertisements, 20 per page
async function listStandardListings(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    // Get optional location parameters for proximity sorting
    const { latitude, longitude, maxDistance } = req.query;
    const userLat = latitude ? parseFloat(latitude) : null;
    const userLon = longitude ? parseFloat(longitude) : null;
    const maxDist = maxDistance ? parseFloat(maxDistance) : null;

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 20;

    // Fetch all matching listings (we'll sort and paginate in memory if using location)
    const fetchAll = userLat !== null && userLon !== null;
    const offset = fetchAll ? 0 : (page - 1) * pageSize;
    const limit = fetchAll ? undefined : pageSize;

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
      order: userLat === null ? [["createdAt", "DESC"]] : [],
      limit,
      offset,
      distinct: true
    });

    let listings = rows;
    let totalCount = count;

    // Calculate distances and sort by proximity if location provided
    if (userLat !== null && userLon !== null) {
      listings = listings.map(listing => {
        if (listing.seller && listing.seller.addresses && listing.seller.addresses.length > 0) {
          const sellerAddr = listing.seller.addresses[0];
          if (sellerAddr.latitude && sellerAddr.longitude) {
            const distance = haversineDistanceKm(
              userLat,
              userLon,
              parseFloat(sellerAddr.latitude),
              parseFloat(sellerAddr.longitude)
            );
            listing.dataValues.distance = Math.round(distance * 10) / 10;
            return listing;
          }
        }
        listing.dataValues.distance = null;
        return listing;
      });

      // Filter by maxDistance if specified
      if (maxDist !== null) {
        listings = listings.filter(l => l.dataValues.distance !== null && l.dataValues.distance <= maxDist);
        totalCount = listings.length;
      }

      // Sort by distance (nearest first)
      listings.sort((a, b) => {
        const distA = a.dataValues.distance !== null ? a.dataValues.distance : Infinity;
        const distB = b.dataValues.distance !== null ? b.dataValues.distance : Infinity;
        return distA - distB;
      });

      // Paginate in memory
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      listings = listings.slice(start, end);
    }

    return res.json({
      success: true,
      listings,
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      location: userLat && userLon ? {
        latitude: userLat,
        longitude: userLon,
        maxDistance: maxDist,
        sortedByDistance: true
      } : null
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
    const userId = req.user && req.user.id;

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

    // Increment view count (don't count seller's own views)
    if (!userId || userId !== item.sellerId) {
      const previousViews = item.views || 0;
      item.views = previousViews + 1;
      await item.save();

      // Notify seller on view milestones (100, 500, 1000, 5000, 10000)
      const milestones = [100, 500, 1000, 5000, 10000];
      const newViews = item.views;
      for (const milestone of milestones) {
        if (previousViews < milestone && newViews >= milestone) {
          await createNotification(
            item.sellerId,
            'listing',
            'View Milestone Reached! 🎉',
            `Your listing "${item.title}" has reached ${milestone} views!`,
            `/listings/${item.listingId}`,
            {
              listingId: item.listingId,
              listingTitle: item.title,
              views: newViews,
              milestone
            }
          );
          break; // Only notify for one milestone at a time
        }
      }

      // Log view activity if user is authenticated
      if (userId && req) {
        logActivity(userId, "view_listing", "listing", id, req, {
          listingTitle: item.title,
          listingPrice: item.price
        });
      }
    }

    // Attach the latest address for the seller
    if (item.sellerId) {
      const latestAddress = await Address.findOne({
        where: { userId: item.sellerId },
        order: [["createdAt", "DESC"]]
      });
      if (latestAddress) {
        item.dataValues.address = latestAddress;
      }
    }

    // Get seller rating (average)
    const ratingData = await Rating.findAll({
      where: { sellerId: item.sellerId },
      attributes: [
        [db.sequelize.fn("AVG", db.sequelize.col("rating")), "averageRating"],
        [db.sequelize.fn("COUNT", db.sequelize.col("ratingId")), "totalRatings"]
      ],
      raw: true
    });

    const sellerRating = {
      averageRating: parseFloat(ratingData[0]?.averageRating || 0).toFixed(1),
      totalRatings: parseInt(ratingData[0]?.totalRatings || 0, 10)
    };
    item.dataValues.sellerRating = sellerRating;

    // Get seller join date
    if (item.seller) {
      item.dataValues.sellerJoinDate = item.seller.createdAt;
    }

    // Get price history for this listing
    const priceHistory = await PriceHistory.findAll({
      where: { listingId: id },
      order: [["createdAt", "DESC"]],
      limit: 10
    });
    item.dataValues.priceHistory = priceHistory;

    // Get related listings (same category, excluding current item)
    const relatedListings = await Listing.findAll({
      where: {
        category: item.category,
        listingId: { [Op.ne]: id },
        status: "active"
      },
      limit: 4,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "seller",
          attributes: ["userId", "firstName", "lastName", "profilePicture"]
        }
      ]
    });
    item.dataValues.relatedListings = relatedListings;

    // Check if item is in user's wishlist (if authenticated)
    if (userId) {
      const inWishlist = await Wishlist.findOne({
        where: { userId, listingId: id }
      });
      item.dataValues.inWishlist = !!inWishlist;
    } else {
      item.dataValues.inWishlist = false;
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

        // Create initial price history entry
        await PriceHistory.create(
          {
            listingId: created.listingId,
            oldPrice: null,
            newPrice: created.price,
            changedBy: created.sellerId
          },
          { transaction: t }
        );

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
    const userId = req.user && req.user.id;

    const item = await Listing.findByPk(id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    // Track price change and notify wishlisters
    if (req.body.price && parseFloat(req.body.price) !== parseFloat(item.price)) {
      const oldPrice = parseFloat(item.price);
      const newPrice = parseFloat(req.body.price);

      // Record price history
      await PriceHistory.create({
        listingId: id,
        oldPrice: item.price,
        newPrice: req.body.price,
        changedBy: userId
      });

      // Notify wishlisters if price dropped
      if (newPrice < oldPrice) {
        const priceDrop = oldPrice - newPrice;
        const percentageDrop = ((priceDrop / oldPrice) * 100).toFixed(0);

        // Get all users who wishlisted this item
        const wishlisters = await Wishlist.findAll({
          where: { listingId: id },
          attributes: ['userId']
        });

        // Notify each wishlister about the price drop
        for (const w of wishlisters) {
          await createNotification(
            w.userId,
            'listing',
            'Price Drop Alert! 💰',
            `"${item.title}" price dropped from R${oldPrice.toFixed(2)} to R${newPrice.toFixed(2)} (-${percentageDrop}%)`,
            `/listings/${id}`,
            {
              listingId: id,
              listingTitle: item.title,
              oldPrice,
              newPrice,
              priceDrop,
              percentageDrop
            }
          );
        }
      }
    }

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
