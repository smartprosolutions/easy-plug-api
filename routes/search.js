const express = require("express");
const router = express.Router();
const {
  searchListings,
  getSearchFilters,
  getSearchSuggestions
} = require("../controllers/searchController");
const auth = require("../middleware/auth");
const { activityLogger } = require("../middleware/activityLogger");

// Search listings with extensive filters
router.get(
  "/",
  auth,
  activityLogger("search", "listing"),
  searchListings
);

// Get available filter options
router.get("/filters", getSearchFilters);

// Get search suggestions/autocomplete
router.get("/suggestions", getSearchSuggestions);

module.exports = router;
