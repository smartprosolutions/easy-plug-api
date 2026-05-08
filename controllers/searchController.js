const db = require("../models");
const {
  listings: Listing,
  users: User,
  address: Address,
  ratings: Rating,
  savedSearch: SavedSearch,
} = db;
const { Op } = require("sequelize");
const { fail } = require("../utils/response");
const { logActivity } = require("../middleware/activityLogger");

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
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

/**
 * Comprehensive search endpoint with extensive filtering
 */
async function searchListings(req, res, next) {
  try {
    const userId = req.user && req.user.id;

    const {
      q,
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

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;
    const normalizedQuery = typeof q === "string" ? q.trim() : "";

    const where = {};

    if (normalizedQuery) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${normalizedQuery}%` } },
        { description: { [Op.iLike]: `%${normalizedQuery}%` } },
        db.sequelize.where(
          db.sequelize.fn(
            "array_to_string",
            db.sequelize.col("keyFeatures"),
            " ",
          ),
          { [Op.iLike]: `%${normalizedQuery}%` },
        ),
      ];
    }

    if (category) where.category = category;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (condition) where.condition = condition;
    if (type) where.type = type;
    if (status) {
      where.status = status;
    } else {
      where.status = "active";
    }

    if (isAdvertisement !== undefined) {
      where.isAdvertisement = isAdvertisement === "true";
    }

    if (postedSince) {
      const daysAgo = parseInt(postedSince, 10);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      where.createdAt = { [Op.gte]: date };
    } else if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

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
      case "views":
        order = [["views", "DESC"]];
        break;
      case "title":
        order = [["title", "ASC"]];
        break;
      case "date_desc":
      default:
        order = [["createdAt", "DESC"]];
        break;
    }

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

    let filteredListings = listings;
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      const sellerIds = [...new Set(listings.map((l) => l.sellerId))];

      const sellerRatings = await Rating.findAll({
        where: { sellerId: { [Op.in]: sellerIds } },
        attributes: [
          "sellerId",
          [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avgRating"],
        ],
        group: ["sellerId"],
        raw: true,
      });

      const ratingMap = {};
      sellerRatings.forEach((r) => {
        ratingMap[r.sellerId] = parseFloat(r.avgRating || 0);
      });

      filteredListings = listings.filter((listing) => {
        const sellerRating = ratingMap[listing.sellerId] || 0;
        return sellerRating >= minRatingNum;
      });

      filteredListings.forEach((listing) => {
        listing.dataValues.sellerAvgRating = ratingMap[listing.sellerId] || 0;
      });
    }

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
            listing.dataValues.distance = Math.round(distance * 10) / 10;
            return distance <= maxDistKm;
          }
        }
        return false;
      });

      if (sortBy === "distance") {
        filteredListings.sort(
          (a, b) =>
            (a.dataValues.distance || Infinity) -
            (b.dataValues.distance || Infinity),
        );
      }
    }

    const totalFiltered = filteredListings.length;
    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    if (userId && req) {
      logActivity(userId, "search", "listing", null, req, {
        searchTerm: normalizedQuery,
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

    if (filteredListings.length > 0) {
      const uniqueRowMap = new Map();

      filteredListings.forEach((listing) => {
        const listingId = listing?.listingId || listing?.id;
        if (!listingId) return;

        const row = {
          listingId,
          userId: userId || null,
        };

        const key = `${row.userId || "guest"}:${row.listingId}`;
        if (!uniqueRowMap.has(key)) {
          uniqueRowMap.set(key, row);
        }
      });

      const rowsToSave = [...uniqueRowMap.values()].slice(0, 100);

      if (rowsToSave.length > 0) {
        SavedSearch.bulkCreate(rowsToSave).catch((error) => {
          console.error("Failed to save fetched search:", error);
        });
      }
    }

    return res.json({
      success: true,
      listings: filteredListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages,
        hasMore,
      },
      filters: {
        q: normalizedQuery,
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

async function getSearchFilters(req, res, next) {
  try {
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

    const priceRange = await Listing.findOne({
      attributes: [
        [db.sequelize.fn("MIN", db.sequelize.col("price")), "minPrice"],
        [db.sequelize.fn("MAX", db.sequelize.col("price")), "maxPrice"],
      ],
      where: { status: "active" },
      raw: true,
    });

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

async function getSearchSuggestions(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = q.trim();

    const suggestions = await Listing.findAll({
      attributes: ["listingId", "title", "price", "category"],
      where: {
        title: { [Op.iLike]: `%${searchTerm}%` },
        status: "active",
      },
      limit: 10,
      order: [["views", "DESC"]],
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

async function getPopularSearches(req, res, next) {
  try {
    const grouped = await SavedSearch.findAll({
      attributes: [
        "listingId",
        [db.sequelize.fn("COUNT", db.sequelize.col("listingId")), "count"],
      ],
      group: ["listingId"],
      order: [
        [db.sequelize.fn("COUNT", db.sequelize.col("listingId")), "DESC"],
      ],
      // Pull more than 4 so we can collapse duplicate titles and still return 4 unique terms.
      limit: 200,
      raw: true,
    });

    const topListingIds = grouped.map((row) => row.listingId).filter(Boolean);
    const counts = new Map(
      grouped.map((row) => [row.listingId, Number(row.count) || 0]),
    );

    if (topListingIds.length === 0) {
      return res.json({
        success: true,
        popularSearches: [],
        popularListings: [],
      });
    }

    const listings = await Listing.findAll({
      where: {
        listingId: { [Op.in]: topListingIds },
        status: "active",
      },
      attributes: [
        "listingId",
        "title",
        "category",
        "images",
        "isAdvertisement",
      ],
      raw: true,
    });

    const listingMap = new Map(listings.map((item) => [item.listingId, item]));

    const popularListings = topListingIds
      .map((listingId) => {
        const listing = listingMap.get(listingId);
        if (!listing) return null;

        return {
          listingId,
          title: listing.title,
          category: listing.category,
          image: Array.isArray(listing.images)
            ? listing.images[0] || null
            : null,
          isAdvertisement: Boolean(listing.isAdvertisement),
          count: counts.get(listingId) || 0,
        };
      })
      .filter(Boolean);

    const termMap = new Map();
    popularListings.forEach((item) => {
      const term = String(item.title || "").trim();
      if (!term) return;

      const key = term.toLowerCase();
      const existing = termMap.get(key);

      if (!existing) {
        termMap.set(key, {
          term,
          listingId: item.listingId,
          count: item.count,
          popularListing: item,
        });
        return;
      }

      existing.count += item.count;
      if ((item.count || 0) > (existing.popularListing?.count || 0)) {
        existing.listingId = item.listingId;
        existing.popularListing = item;
      }
    });

    const uniqueTerms = [...termMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const uniquePopularListings = uniqueTerms
      .map((entry) => ({
        ...entry.popularListing,
        listingId: entry.listingId,
        count: entry.count,
        title: entry.term,
      }))
      .filter(Boolean);

    const popularSearches = uniqueTerms.map((entry) => ({
      term: entry.term,
      listingId: entry.listingId,
      count: entry.count,
    }));

    return res.json({
      success: true,
      popularSearches,
      popularListings: uniquePopularListings,
    });
  } catch (err) {
    next(err);
  }
}

async function saveSearch(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { listingId } = req.body || {};
    if (!listingId) return fail(res, "listingId is required", 400);

    const saved = await SavedSearch.create({
      userId,
      listingId,
    });

    return res.status(201).json({
      success: true,
      message: "Search saved successfully",
      savedSearch: {
        savedSearchId: saved.savedSearchId,
        userId: saved.userId,
        listingId: saved.listingId,
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

    const { rows, count } = await SavedSearch.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    const savedSearches = rows.map((row) => ({
      savedSearchId: row.savedSearchId,
      userId: row.userId,
      listingId: row.listingId,
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

    const deleted = await SavedSearch.destroy({
      where: {
        savedSearchId,
        userId,
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
  getPopularSearches,
  saveSearch,
  listSavedSearches,
  deleteSavedSearch,
};
