const express = require('express');
const router = express.Router();
const { listRatings, createRating } = require('../controllers/ratingsController');
const auth = require('../middleware/auth');

router.get('/', listRatings);
router.post('/', auth, createRating);

module.exports = router;
