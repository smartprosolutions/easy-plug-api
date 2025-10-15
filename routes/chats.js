const express = require('express');
const router = express.Router();
const { createOrGetChat, listChats, getChat } = require('../controllers/chatsController');
const auth = require('../middleware/auth');

router.post('/', auth, createOrGetChat);
router.get('/', auth, listChats);
router.get('/:id', auth, getChat);

module.exports = router;
