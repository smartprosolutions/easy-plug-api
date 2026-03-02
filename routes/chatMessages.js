const express = require("express");
const router = express.Router();
const {
  sendMessage,
  listMessages,
  markAsRead,
  getUnreadMessageCount,
} = require("../controllers/chatMessagesController");
const auth = require("../middleware/auth");

router.post("/", auth, sendMessage);
router.get("/unread/count", auth, getUnreadMessageCount);
router.get("/:chatId", auth, listMessages);
router.post("/chat/:chatId/read", auth, markAsRead);
router.post("/:id/read", auth, markAsRead);

module.exports = router;
