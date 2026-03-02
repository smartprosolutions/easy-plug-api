const db = require("../models");
const {
  listings: Listing,
  users: User,
  address: Address,
  ratings: Rating,
  activityLog: ActivityLog,
} = db;
const { Op } = require("sequelize");
const { fail } = require("../utils/response");
const { logActivity } = require("../middleware/activityLogger");

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Comprehensive search endpoint with extensive filtering
 *
 * Query Parameters:
 * - q: Text search (searches title, description, keyFeatures)
 * - category: Filter by category
 * - minPrice: Minimum price
 * - maxPrice: Maximum price
 * - condition: new, used, refurbished
 * - type: sale, rent, etc.
 * - status: active, sold, inactive
 * - minRating: Minimum seller rating (1-5)
 * - latitude: User's latitude for distance search
 * - longitude: User's longitude for distance search
 * - maxDistance: Maximum distance in km
 * - postedSince: Filter by days ago (7, 30, etc.)
 * - dateFrom: Filter from specific date (YYYY-MM-DD)
 * - dateTo: Filter to specific date (YYYY-MM-DD)
 * - isAdvertisement: true/false
 * - sortBy: price_asc, price_desc, date_asc, date_desc, views, rating
 * - page: Page number (default 1)
 * - limit: Results per page (default 20, max 100)
 */
async function searchListings(req, res, next) {
  try {
    const userId = req.user && req.user.id;

    // Parse query parameters
    const {
      q, // text search
      category,
      minPrice,
      maxPrice,
      condition,
      type,
      status,
      minRating,
      latitude,
      longitude,
      maxDistance,
      postedSince,
      dateFrom,
      dateTo,
      isAdvertisement,
      sortBy = "date_desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause for listings
    const where = {};

    // Text search (title, description, keyFeatures)
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where[Op.or] = [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
        // Search in keyFeatures array
        db.sequelize.where(
          db.sequelize.fn(
            "array_to_string",
            db.sequelize.col("keyFeatures"),
            " ",
          ),
          { [Op.iLike]: `%${searchTerm}%` },
        ),
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price[Op.gte] = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    // Condition filter
    if (condition) {
      where.condition = condition;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Status filter (default to active only)
    if (status) {
      where.status = status;
    } else {
      where.status = "active"; // Default: only show active listings
    }

    // Advertisement filter
    if (isAdvertisement !== undefined) {
      where.isAdvertisement = isAdvertisement === "true";
    }

    // Date filters
    if (postedSince) {
      const daysAgo = parseInt(postedSince, 10);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      where.createdAt = { [Op.gte]: date };
    } else if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    // Build order clause
    let order = [];
    switch (sortBy) {
      case "price_asc":
        order = [["price", "ASC"]];
        break;
      case "price_desc":
        order = [["price", "DESC"]];
        break;
      case "date_asc":
        order = [["createdAt", "ASC"]];
        break;
      case "date_desc":
      default:
        order = [["createdAt", "DESC"]];
        break;
      case "views":
        order = [["views", "DESC"]];
        break;
      case "title":
        order = [["title", "ASC"]];
        break;
    }

    // Fetch listings with seller info and address
    const { rows: listings, count } = await Listing.findAndCountAll({
      where,
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
                "radius",
                "streetNumber",
                "streetName",
                "suburb",
                "city",
                "province",
                "country",
                "postalCode",
              ],
              separate: true,
              limit: 1,
              order: [["createdAt", "DESC"]],
            },
          ],
        },
      ],
      order,
      limit: limitNum,
      offset,
      distinct: true,
    });

    // If seller rating filter is applied, fetch ratings and filter
    let filteredListings = listings;
    if (minRating) {
      const minRatingNum = parseFloat(minRating);

      // Get seller IDs from listings
      const sellerIds = [...new Set(listings.map((l) => l.sellerId))];

      // Fetch average ratings for all sellers
      const sellerRatings = await Rating.findAll({
        where: { sellerId: { [Op.in]: sellerIds } },
        attributes: [
          "sellerId",
          [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avgRating"],
        ],
        group: ["sellerId"],
        raw: true,
      });

      // Create a map of seller ratings
      const ratingMap = {};
      sellerRatings.forEach((r) => {
        ratingMap[r.sellerId] = parseFloat(r.avgRating || 0);
      });

      // Filter listings by seller rating
      filteredListings = listings.filter((listing) => {
        const sellerRating = ratingMap[listing.sellerId] || 0;
        return sellerRating >= minRatingNum;
      });

      // Attach ratings to listings
      filteredListings.forEach((listing) => {
        listing.dataValues.sellerAvgRating = ratingMap[listing.sellerId] || 0;
      });
    }

    // If location filter is applied, calculate distances and filter
    if (latitude && longitude && maxDistance) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxDistKm = parseFloat(maxDistance);

      filteredListings = filteredListings.filter((listing) => {
        if (
          listing.seller &&
          listing.seller.addresses &&
          listing.seller.addresses.length > 0
        ) {
          const sellerAddr = listing.seller.addresses[0];
          if (sellerAddr.latitude && sellerAddr.longitude) {
            const distance = haversineDistance(
              userLat,
              userLon,
              parseFloat(sellerAddr.latitude),
              parseFloat(sellerAddr.longitude),
            );
            listing.dataValues.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
            return distance <= maxDistKm;
          }
        }
        return false;
      });

      // Sort by distance if location filter is used and sortBy is rating
      if (sortBy === "distance") {
        filteredListings.sort(
          (a, b) =>
            (a.dataValues.distance || Infinity) -
            (b.dataValues.distance || Infinity),
        );
      }
    }

    // Calculate total pages based on filtered results
    const totalFiltered = filteredListings.length;
    const totalPages = Math.ceil(
      (minRating || (latitude && longitude && maxDistance)
        ? totalFiltered
        : count) / limitNum,
    );

    // Log search activity
    if (userId && req) {
      logActivity(userId, "search", "listing", null, req, {
        searchTerm: q,
        filters: {
          category,
          minPrice,
          maxPrice,
          condition,
          type,
          minRating,
          location:
            latitude && longitude ? { latitude, longitude, maxDistance } : null,
        },
        resultsCount: filteredListings.length,
      });
    }

    return res.json({
      success: true,
      listings: filteredListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total:
          minRating || (latitude && longitude && maxDistance)
            ? totalFiltered
            : count,
        totalPages,
        hasMore: pageNum < totalPages,
      },
      filters: {
        q,
        category,
        minPrice,
        maxPrice,
        condition,
        type,
        status,
        minRating,
        location:
          latitude && longitude ? { latitude, longitude, maxDistance } : null,
        postedSince,
        dateFrom,
        dateTo,
        isAdvertisement,
        sortBy,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    next(err);
  }
}

/**
 * Get available filter options (categories, conditions, price ranges, etc.)
 */
async function getSearchFilters(req, res, next) {
  try {
    // Get unique categories
    const categories = await Listing.findAll({
      attributes: [
        "category",
        [db.sequelize.fn("COUNT", db.sequelize.col("category")), "count"],
      ],
      where: { status: "active" },
      group: ["category"],
      order: [[db.sequelize.fn("COUNT", db.sequelize.col("category")), "DESC"]],
      raw: true,
    });

    // Get unique conditions
    const conditions = await Listing.findAll({
      attributes: [
        "condition",
        [db.sequelize.fn("COUNT", db.sequelize.col("condition")), "count"],
      ],
      where: { status: "active" },
      group: ["condition"],
      order: [
        [db.sequelize.fn("COUNT", db.sequelize.col("condition")), "DESC"],
      ],
      raw: true,
    });

    // Get price range
    const priceRange = await Listing.findOne({
      attributes: [
        [db.sequelize.fn("MIN", db.sequelize.col("price")), "minPrice"],
        [db.sequelize.fn("MAX", db.sequelize.col("price")), "maxPrice"],
      ],
      where: { status: "active" },
      raw: true,
    });

    // Get unique types
    const types = await Listing.findAll({
      attributes: [
        "type",
        [db.sequelize.fn("COUNT", db.sequelize.col("type")), "count"],
      ],
      where: { status: "active" },
      group: ["type"],
      order: [[db.sequelize.fn("COUNT", db.sequelize.col("type")), "DESC"]],
      raw: true,
    });

    return res.json({
      success: true,
      filters: {
        categories: categories.map((c) => ({
          value: c.category,
          label: c.category,
          count: parseInt(c.count, 10),
        })),
        conditions: conditions.map((c) => ({
          value: c.condition,
          label: c.condition,
          count: parseInt(c.count, 10),
        })),
        types: types.map((t) => ({
          value: t.type,
          label: t.type,
          count: parseInt(t.count, 10),
        })),
        priceRange: {
          min: parseFloat(priceRange?.minPrice || 0),
          max: parseFloat(priceRange?.maxPrice || 0),
        },
        sortOptions: [
          { value: "date_desc", label: "Newest First" },
          { value: "date_asc", label: "Oldest First" },
          { value: "price_asc", label: "Price: Low to High" },
          { value: "price_desc", label: "Price: High to Low" },
          { value: "views", label: "Most Viewed" },
          { value: "title", label: "Title (A-Z)" },
          { value: "distance", label: "Distance (Nearest)" },
        ],
        dateFilters: [
          { value: "1", label: "Last 24 hours" },
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 3 months" },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get search suggestions/autocomplete
 */
async function getSearchSuggestions(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = q.trim();

    // Get matching titles (limit 10)
    const suggestions = await Listing.findAll({
      attributes: ["listingId", "title", "price", "category"],
      where: {
        title: { [Op.iLike]: `%${searchTerm}%` },
        status: "active",
      },
      limit: 10,
      order: [["views", "DESC"]], // Suggest popular items first
    });

    return res.json({
      success: true,
      suggestions: suggestions.map((s) => ({
        id: s.listingId,
        title: s.title,
        price: s.price,
        category: s.category,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function saveSearch(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { name, filters } = req.body || {};

    let normalizedFilters = filters;
    if (!normalizedFilters || typeof normalizedFilters !== "object") {
      normalizedFilters = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (key !== "name") normalizedFilters[key] = value;
      }
    }

    if (!normalizedFilters || Object.keys(normalizedFilters).length === 0) {
      return fail(res, "filters are required", 400);
    }

    const saved = await ActivityLog.create({
      userId,
      action: "saved_search",
      entityType: "search",
      metadata: {
        name: name || null,
        filters: normalizedFilters,
      },
      ipAddress:
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    });

    return res.status(201).json({
      success: true,
      message: "Search saved successfully",
      savedSearch: {
        savedSearchId: saved.activityId,
        userId: saved.userId,
        name: saved.metadata?.name || null,
        filters: saved.metadata?.filters || {},
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listSavedSearches(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize || "20", 10) || 20, 1),
      100,
    );
    const offset = (page - 1) * pageSize;

    const { rows, count } = await ActivityLog.findAndCountAll({
      where: {
        userId,
        action: "saved_search",
        entityType: "search",
      },
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    const savedSearches = rows.map((row) => ({
      savedSearchId: row.activityId,
      userId: row.userId,
      name: row.metadata?.name || null,
      filters: row.metadata?.filters || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return res.json({
      success: true,
      savedSearches,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteSavedSearch(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { savedSearchId } = req.params;
    if (!savedSearchId) return fail(res, "savedSearchId is required", 400);

    const deleted = await ActivityLog.destroy({
      where: {
        activityId: savedSearchId,
        userId,
        action: "saved_search",
        entityType: "search",
      },
    });

    if (deleted === 0) {
      return fail(res, "Saved search not found", 404);
    }

    return res.json({
      success: true,
      message: "Saved search deleted",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchListings,
  getSearchFilters,
  getSearchSuggestions,
  saveSearch,
  listSavedSearches,
  deleteSavedSearch,
};
