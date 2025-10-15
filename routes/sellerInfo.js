const express = require("express");
const router = express.Router();
const {
  getSellerInfo,
  updateSellerInfo,
  updateMySellerInfo,
  uploadBusinessPicture
} = require("../controllers/sellerInfoController");
const auth = require("../middleware/auth");

// Authenticated self-service endpoints
router.put("/me", auth, updateMySellerInfo);
router.post("/me/business-picture", auth, uploadBusinessPicture);

router.get("/:id", getSellerInfo);
router.put("/:id", auth, updateSellerInfo);

module.exports = router;
