const express = require("express");
const router = express.Router();
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationsController");
const auth = require("../middleware/auth");

// All notification routes require authentication
router.get("/", auth, getMyNotifications);
router.get("/unread-count", auth, getUnreadCount);
router.put("/:id/read", auth, markAsRead);
router.put("/read-all", auth, markAllAsRead);
router.delete("/:id", auth, deleteNotification);

module.exports = router;
