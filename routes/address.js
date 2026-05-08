const express = require("express");
const router = express.Router();
const {
  listAddresses,
  createAddress,
  createAddressByBrowser,
  getMyAddress,
  updateAddressById,
  updateMyAddress,
  deleteMyAddress,
} = require("../controllers/addressController");
const auth = require("../middleware/auth");

router.get("/", listAddresses);
router.post("/", auth, createAddress);
router.post("/browser", createAddressByBrowser);
router.get("/me", auth, getMyAddress);
router.put("/", auth, updateMyAddress);
router.put("/me", auth, updateMyAddress);
router.put("/:addressId", auth, updateAddressById);
router.delete("/me", auth, deleteMyAddress);
router.delete("/:addressId", auth, deleteMyAddress);

module.exports = router;
