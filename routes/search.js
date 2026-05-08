const express = require("express");
const router = express.Router();
const {
  searchListings,
  getSearchFilters,
  getSearchSuggestions,
  getPopularSearches,
  saveSearch,
  listSavedSearches,
  deleteSavedSearch,
} = require("../controllers/searchController");
const auth = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");

// Search listings with extensive filters
router.get(
  "/",
  activityLogger("search", "listing"),
  searchListings
);

// Get available filter options
router.get("/filters", getSearchFilters);

// Get search suggestions/autocomplete
router.get("/suggestions", getSearchSuggestions);

// Get top popular search terms from saved searches
router.get("/popular", getPopularSearches);

// Save and manage saved searches
router.post("/saved", auth, saveSearch);
router.get("/saved", auth, listSavedSearches);
router.delete("/saved/:savedSearchId", auth, deleteSavedSearch);

module.exports = router;
