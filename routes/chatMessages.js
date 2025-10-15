const express = require('express');
const router = express.Router();
const { sendMessage, listMessages, markAsRead } = require('../controllers/chatMessagesController');
const auth = require('../middleware/auth');

router.post('/', auth, sendMessage);
router.get('/:chatId', auth, listMessages);
router.post('/:id/read', auth, markAsRead);

module.exports = router;
