const express = require("express");
const router = express.Router();
const {
  listAddresses,
  createAddress,
  createAddressByBrowser,
  getMyAddress,
} = require("../controllers/addressController");
const auth = require("../middleware/auth");

router.get("/", listAddresses);
router.post("/", auth, createAddress);
router.post("/browser", createAddressByBrowser);
router.get("/me", auth, getMyAddress);

module.exports = router;
