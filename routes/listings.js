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
  createAdvertListing,
  addListingToAdvert,
  getAdvertWithItems,
  getSellerCatalogue,
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
// seller catalogues - adverts with their items
router.get("/catalogue", auth, protect(["seller", "admin"]), getSellerCatalogue);
// get advert/catalogue with all its items (public)
router.get("/advert/:id", getAdvertWithItems);
// single listing by id (kept last so static routes like /me don't get shadowed)
router.get("/:id", getListing);
// create standard listing (isAdvertisement = false)
router.post("/", auth, createListing);
// create advert/catalogue (isAdvertisement = true, requires subscriptionId)
router.post("/advert", auth, createAdvertListing);
// add listing to an existing advert/catalogue
router.post("/advert/:advertId/items", auth, addListingToAdvert);
router.put("/:id", auth, updateListing);
router.delete("/:id", auth, deleteListing);

// (removed duplicate admin/me routes)

module.exports = router;
