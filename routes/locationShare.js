const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createShare,
  getShare,
  stopShare,
  myActiveSessions,
} = require("../controllers/locationShareController");

router.post("/", auth, createShare);
router.get("/my/active", auth, myActiveSessions);
router.get("/:token", getShare);
router.delete("/:token", auth, stopShare);

module.exports = router;
