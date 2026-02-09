const express = require("express");
const router = express.Router();
const {
  listListings,
  listAdListings,
  listStandardListings,
  adminListListings,
  sellerListListings,
  getListing,
  createListing,
  updateListing,
  deleteListing
} = require("../controllers/listingsController");
const auth = require("../middleware/auth");
const protect = require("../middleware/protect");

// public or filtered listing endpoint (keeps existing behavior)
// public or filtered listing endpoint (keeps existing behavior)
router.get("/", auth, listListings);
// new separated feeds
router.get("/ads", auth, listAdListings);
router.get("/standard", auth, listStandardListings);
// admin route - only admin should access
router.get("/admin/all", auth, protect(["admin"]), adminListListings);
// seller-specific listings for authenticated seller
router.get("/me", auth, protect(["seller", "admin"]), sellerListListings);
// single listing by id (kept last so static routes like /me don't get shadowed)
router.get("/:id", getListing);
// create/update/delete require auth
router.post("/", auth, createListing);
router.put("/:id", auth, updateListing);
router.delete("/:id", auth, deleteListing);

// (removed duplicate admin/me routes)

module.exports = router;
