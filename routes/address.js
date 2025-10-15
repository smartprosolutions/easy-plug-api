const express = require('express');
const router = express.Router();
const { listAddresses, createAddress, getMyAddress } = require('../controllers/addressController');
const auth = require('../middleware/auth');

router.get('/', listAddresses);
router.post('/', auth, createAddress);
router.get('/me', auth, getMyAddress);

module.exports = router;
