const {
  payments: Payment,
  transactions: Transaction,
  listings: Listing,
} = require("../models");
const {
  buildPayfastPayload,
  verifyIPN,
  PAYFAST_PROCESS_URL,
} = require("../utils/payfast");
const { success, fail } = require("../utils/response");
const { createNotification } = require("./notificationsController");

// list payments
async function listPayments(req, res, next) {
  try {
    const items = await Payment.findAll();
    return success(res, { payments: items });
  } catch (err) {
    next(err);
  }
}

// create a PayFast payment payload for a transaction
async function createPayment(req, res, next) {
  try {
    const { transactionId } = req.body;
    if (!transactionId) return fail(res, "transactionId required", 400);
    const trx = await Transaction.findOne({ where: { transactionId } });
    if (!trx) return fail(res, "Transaction not found", 404);

    const host = req.get("host");
    const protocol = req.protocol;
    const base = `${protocol}://${host}`;
    const return_url = `${base}/api/v1/payments/payfast/return`;
    const cancel_url = `${base}/api/v1/payments/payfast/cancel`;
    const notify_url = `${base}/api/v1/payments/payfast/notify`;

    const { payload, signature, processUrl } = buildPayfastPayload({
      amount: trx.amount,
      item_name: `Transaction ${trx.transactionId}`,
      m_payment_id: trx.transactionId,
      email_address: req.user && req.user.email,
      return_url,
      cancel_url,
      notify_url,
    });

    // Save a pending payment record
    await Payment.create({
      transactionId: trx.transactionId,
      paymentMethod: "payfast",
      status: "pending",
      amount: trx.amount,
      referenceNumber: null,
    });

    const listing = await Listing.findByPk(trx.listingId, {
      attributes: ["listingId", "title"],
    });

    if (trx.buyerId) {
      await createNotification(
        trx.buyerId,
        "transaction",
        "Payment Initiated",
        `Your payment for "${listing ? listing.title : `Transaction ${trx.transactionId}`}" has been initiated.`,
        `/transactions/${trx.transactionId}`,
        {
          transactionId: trx.transactionId,
          listingId: trx.listingId,
          listingTitle: listing ? listing.title : null,
          amount: trx.amount,
          status: "pending",
        },
      );
    }

    if (trx.sellerId && trx.sellerId !== trx.buyerId) {
      await createNotification(
        trx.sellerId,
        "transaction",
        "Buyer Started Payment",
        `A buyer started payment for "${listing ? listing.title : `Transaction ${trx.transactionId}`}".`,
        `/transactions/${trx.transactionId}`,
        {
          transactionId: trx.transactionId,
          listingId: trx.listingId,
          listingTitle: listing ? listing.title : null,
          amount: trx.amount,
          status: "pending",
        },
      );
    }

    // Return the process URL and payload for client to submit form or redirect
    return success(res, { processUrl, payload, signature });
  } catch (err) {
    next(err);
  }
}

// PayFast IPN handler
async function payfastNotify(req, res, next) {
  try {
    const body = req.body || {};
    // verify signature and validate with PayFast
    const validation = await verifyIPN(body);
    if (validation !== "VALID") {
      return fail(res, "Invalid IPN", 400);
    }

    // find payment/transaction
    const m_payment_id = body.m_payment_id;
    const pf_payment_id = body.payment_id;
    const pf_amount = body.amount_gross;
    const pf_status = body.payment_status || body.status || "COMPLETE";

    // update payment record
    const payment = await Payment.findOne({
      where: { transactionId: m_payment_id },
    });
    const previousPaymentStatus = payment ? payment.status : null;
    if (payment) {
      payment.status = pf_status;
      payment.referenceNumber = pf_payment_id;
      payment.paidAt = new Date();
      await payment.save();
    } else {
      await Payment.create({
        transactionId: m_payment_id,
        paymentMethod: "payfast",
        status: pf_status,
        referenceNumber: pf_payment_id,
        amount: pf_amount,
        paidAt: new Date(),
      });
    }

    // update transaction status
    const trx = await Transaction.findOne({
      where: { transactionId: m_payment_id },
    });
    if (trx) {
      trx.status = "paid";
      await trx.save();

      const normalizedStatus = String(pf_status || "").toLowerCase();
      const statusChanged =
        previousPaymentStatus === null ||
        String(previousPaymentStatus).toLowerCase() !== normalizedStatus;

      if (statusChanged) {
        const listing = await Listing.findByPk(trx.listingId, {
          attributes: ["listingId", "title"],
        });

        const isSuccess = ["complete", "completed", "paid"].includes(
          normalizedStatus,
        );
        const buyerTitle = isSuccess
          ? "Payment Successful ✅"
          : "Payment Status Updated";
        const sellerTitle = isSuccess
          ? "Buyer Payment Confirmed ✅"
          : "Payment Status Updated";
        const statusText = isSuccess
          ? "successful"
          : normalizedStatus || "updated";

        if (trx.buyerId) {
          await createNotification(
            trx.buyerId,
            "transaction",
            buyerTitle,
            `Payment for "${listing ? listing.title : `Transaction ${trx.transactionId}`}" is ${statusText}.`,
            `/transactions/${trx.transactionId}`,
            {
              transactionId: trx.transactionId,
              listingId: trx.listingId,
              listingTitle: listing ? listing.title : null,
              paymentId: pf_payment_id,
              status: normalizedStatus || pf_status,
              amount: pf_amount,
            },
          );
        }

        if (trx.sellerId && trx.sellerId !== trx.buyerId) {
          await createNotification(
            trx.sellerId,
            "transaction",
            sellerTitle,
            `Payment for "${listing ? listing.title : `Transaction ${trx.transactionId}`}" is ${statusText}.`,
            `/transactions/${trx.transactionId}`,
            {
              transactionId: trx.transactionId,
              listingId: trx.listingId,
              listingTitle: listing ? listing.title : null,
              paymentId: pf_payment_id,
              status: normalizedStatus || pf_status,
              amount: pf_amount,
            },
          );
        }
      }
    }

    // respond 200 OK to PayFast
    return res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
}

// Return handler (customer redirected after payment)
async function payfastReturn(req, res, next) {
  try {
    // For now, just inform the user
    return success(res, {
      message: "Payment completed. IPN will confirm status shortly.",
    });
  } catch (err) {
    next(err);
  }
}

// Cancel handler
async function payfastCancel(req, res, next) {
  try {
    return success(res, { message: "Payment was cancelled" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPayments,
  createPayment,
  payfastNotify,
  payfastReturn,
  payfastCancel,
};
