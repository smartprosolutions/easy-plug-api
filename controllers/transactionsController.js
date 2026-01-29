const { transactions: Transaction, listings: Listing, users: User } = require('../models');
const { createNotification } = require('./notificationsController');

async function listTransactions(req, res, next) {
  try {
    const items = await Transaction.findAll();
    return res.json({ success: true, transactions: items });
  } catch (err) {
    next(err);
  }
}

async function createTransaction(req, res, next) {
  try {
    const buyerId = req.user && req.user.id;
    const { listingId, sellerId, amount, status } = req.body;

    if (!listingId || !sellerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'listingId, sellerId, and amount are required'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      buyerId: buyerId || req.body.buyerId,
      sellerId,
      listingId,
      amount,
      status: status || 'pending'
    });

    // Get listing and buyer info for notifications
    const listing = await Listing.findByPk(listingId, {
      attributes: ['listingId', 'title', 'price']
    });

    const buyer = await User.findByPk(buyerId || req.body.buyerId, {
      attributes: ['userId', 'firstName', 'lastName']
    });

    // Notify seller about new transaction
    if (listing && buyer) {
      await createNotification(
        sellerId,
        'transaction',
        'New Transaction! 💰',
        `${buyer.firstName} ${buyer.lastName} initiated a purchase for "${listing.title}" (R${amount})`,
        `/transactions/${transaction.transactionId}`,
        {
          transactionId: transaction.transactionId,
          listingId,
          listingTitle: listing.title,
          amount,
          buyerName: `${buyer.firstName} ${buyer.lastName}`
        }
      );

      // Notify buyer about transaction confirmation
      await createNotification(
        buyerId || req.body.buyerId,
        'transaction',
        'Transaction Created',
        `Your purchase request for "${listing.title}" has been created`,
        `/transactions/${transaction.transactionId}`,
        {
          transactionId: transaction.transactionId,
          listingId,
          listingTitle: listing.title,
          amount
        }
      );
    }

    return res.status(201).json({
      success: true,
      transaction
    });
  } catch (err) {
    next(err);
  }
}

async function updateTransactionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const oldStatus = transaction.status;
    transaction.status = status;
    await transaction.save();

    // Get listing info
    const listing = await Listing.findByPk(transaction.listingId, {
      attributes: ['listingId', 'title']
    });

    // Notify buyer and seller about status change
    if (listing && status !== oldStatus) {
      const statusMessages = {
        'completed': {
          buyer: 'Transaction Completed! ✅',
          seller: 'Transaction Completed! ✅',
          message: 'has been completed'
        },
        'cancelled': {
          buyer: 'Transaction Cancelled',
          seller: 'Transaction Cancelled',
          message: 'has been cancelled'
        },
        'processing': {
          buyer: 'Transaction Processing',
          seller: 'Transaction Processing',
          message: 'is being processed'
        }
      };

      const msgConfig = statusMessages[status] || {
        buyer: 'Transaction Updated',
        seller: 'Transaction Updated',
        message: `status changed to ${status}`
      };

      // Notify buyer
      await createNotification(
        transaction.buyerId,
        'transaction',
        msgConfig.buyer,
        `Your transaction for "${listing.title}" ${msgConfig.message}`,
        `/transactions/${id}`,
        {
          transactionId: id,
          listingTitle: listing.title,
          status,
          oldStatus
        }
      );

      // Notify seller
      await createNotification(
        transaction.sellerId,
        'transaction',
        msgConfig.seller,
        `Transaction for "${listing.title}" ${msgConfig.message}`,
        `/transactions/${id}`,
        {
          transactionId: id,
          listingTitle: listing.title,
          status,
          oldStatus
        }
      );
    }

    return res.json({
      success: true,
      transaction
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransactionStatus
};
