const {
  ratings: Rating,
  users: User,
  listings: Listing,
} = require("../models");
const { createNotification } = require("./notificationsController");

async function listRatings(req, res, next) {
  try {
    const items = await Rating.findAll();
    return res.json({ success: true, ratings: items });
  } catch (err) {
    next(err);
  }
}

async function createRating(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    const { listingId, rating, comment } = req.body;

    if (!listingId) {
      return res
        .status(400)
        .json({ success: false, message: "listingId is required" });
    }

    const listing = await Listing.findByPk(listingId, {
      attributes: ["listingId", "sellerId"],
    });

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    const sellerId = listing.sellerId;

    // Add userId to the rating
    const ratingData = {
      ...req.body,
      listingId,
      sellerId,
      userId: userId || req.body.userId,
    };

    const created = await Rating.create(ratingData);

    // Get rater info for notification
    const rater = await User.findByPk(userId || req.body.userId, {
      attributes: ["userId", "firstName", "lastName"],
    });

    // Create notification for seller
    if (sellerId && rater) {
      const stars = "⭐".repeat(Math.round(rating));
      await createNotification(
        sellerId,
        "account",
        "New Rating Received",
        `${rater.firstName} ${rater.lastName} rated you ${stars} (${rating}/5)${comment ? ': "' + comment.substring(0, 50) + '..."' : ""}`,
        `/ratings`,
        {
          ratingId: created.ratingId,
          rating,
          comment,
          raterName: `${rater.firstName} ${rater.lastName}`,
        },
      );
    }

    return res.status(201).json({ success: true, rating: created });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRatings, createRating };
