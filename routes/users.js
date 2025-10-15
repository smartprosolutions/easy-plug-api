const express = require("express");
const router = express.Router();
const {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  uploadProfilePicture
} = require("../controllers/usersController");
const auth = require("../middleware/auth");

// Authenticated self-service endpoints
router.put("/me", auth, updateMe);
router.post("/me/profile-picture", auth, uploadProfilePicture);

router.get("/", listUsers);
router.get("/:id", getUser);
router.put("/:id", auth, updateUser);
router.delete("/:id", auth, deleteUser);

module.exports = router;
