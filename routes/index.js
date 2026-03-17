const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const subscriptionsRoutes = require('./subscriptions');
const usersRoutes = require('./users');
const listingsRoutes = require('./listings');
const sellerInfoRoutes = require('./sellerInfo');
const sellerSubscriptionRoutes = require('./sellerSubscription');
const ratingsRoutes = require('./ratings');
const transactionsRoutes = require('./transactions');
const paymentsRoutes = require('./payments');
const chatsRoutes = require('./chats');
const chatMessagesRoutes = require('./chatMessages');
const addressRoutes = require('./address');
const wishlistRoutes = require('./wishlist');
const notificationsRoutes = require('./notifications');
const searchRoutes = require('./search');
const locationShareRoutes = require('./locationShare');

router.use('/auth', authRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/users', usersRoutes);
router.use('/listings', listingsRoutes);
router.use('/seller-info', sellerInfoRoutes);
router.use('/seller-subscriptions', sellerSubscriptionRoutes);
router.use('/ratings', ratingsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/chats', chatsRoutes);
router.use('/chat-messages', chatMessagesRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/search', searchRoutes);
router.use('/location-shares', locationShareRoutes);

module.exports = router;
