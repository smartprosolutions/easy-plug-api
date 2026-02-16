const express = require("express");
const router = express.Router();
const {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist
} = require("../controllers/wishlistController");
const auth = require("../middleware/auth");

// All wishlist routes require authentication
router.post("/", auth, addToWishlist);
router.get("/", auth, getMyWishlist);
router.get("/check/:listingId", auth, checkWishlist);
router.delete("/:listingId", auth, removeFromWishlist);

module.exports = router;
