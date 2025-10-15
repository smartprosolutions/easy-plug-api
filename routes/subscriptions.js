const express = require('express');
const router = express.Router();
const {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription
} = require('../controllers/subscriptionsController');

const auth = require('../middleware/auth');
const protect = require('../middleware/protect');

router.get('/', listSubscriptions);
router.get('/:id', getSubscription);

// protected routes — only admin users can create/update/delete
router.post('/', auth, protect(['admin', 'seller']), createSubscription);
router.put('/:id', auth, protect(['admin', 'seller']), updateSubscription);
router.delete('/:id', auth, protect(['admin', 'seller']), deleteSubscription);

module.exports = router;
