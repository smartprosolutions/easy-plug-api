const { wishlist: Wishlist, listings: Listing, users: User } = require("../models");
const { success, fail } = require("../utils/response");
const { createNotification } = require("./notificationsController");

// Add item to wishlist
async function addToWishlist(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { listingId } = req.body;
    if (!listingId) return fail(res, "listingId is required", 400);

    // Check if listing exists
    const listing = await Listing.findByPk(listingId);
    if (!listing) return fail(res, "Listing not found", 404);

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      where: { userId, listingId }
    });
    if (existing) {
      return res.json({
        success: true,
        message: "Item already in wishlist",
        wishlist: existing
      });
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({ userId, listingId });

    // Get user info for notification
    const user = await User.findByPk(userId, {
      attributes: ['userId', 'firstName', 'lastName']
    });

    // Notify seller that someone wishlisted their item
    if (listing.sellerId && user) {
      await createNotification(
        listing.sellerId,
        'listing',
        'Item Added to Wishlist! ❤️',
        `${user.firstName} ${user.lastName} added "${listing.title}" to their wishlist`,
        `/listings/${listingId}`,
        {
          listingId,
          listingTitle: listing.title,
          userId,
          userName: `${user.firstName} ${user.lastName}`
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Added to wishlist",
      wishlist: wishlistItem
    });
  } catch (err) {
    next(err);
  }
}

// Remove item from wishlist
async function removeFromWishlist(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { listingId } = req.params;
    if (!listingId) return fail(res, "listingId is required", 400);

    const deleted = await Wishlist.destroy({
      where: { userId, listingId }
    });

    if (deleted === 0) {
      return fail(res, "Item not found in wishlist", 404);
    }

    return res.json({
      success: true,
      message: "Removed from wishlist"
    });
  } catch (err) {
    next(err);
  }
}

// Get user's wishlist
async function getMyWishlist(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    const { rows, count } = await Wishlist.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Listing,
          as: "listing",
          include: [
            {
              model: User,
              as: "seller",
              attributes: { exclude: ["passwordHash"] }
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
      wishlist: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (err) {
    next(err);
  }
}

// Check if item is in user's wishlist
async function checkWishlist(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { listingId } = req.params;
    const item = await Wishlist.findOne({
      where: { userId, listingId }
    });

    return res.json({
      success: true,
      inWishlist: !!item
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist
};
