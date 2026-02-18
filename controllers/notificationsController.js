const { notification: Notification } = require("../models");
const { success, fail } = require("../utils/response");

// Get user's notifications
async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;
    const unreadOnly = req.query.unreadOnly === "true";

    const where = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset
    });

    return res.json({
      success: true,
      notifications: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (err) {
    next(err);
  }
}

// Get unread notification count
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const count = await Notification.count({
      where: { userId, isRead: false }
    });

    return res.json({
      success: true,
      unreadCount: count
    });
  } catch (err) {
    next(err);
  }
}

// Mark notification as read
async function markAsRead(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { notificationId: id, userId }
    });

    if (!notification) {
      return fail(res, "Notification not found", 404);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.json({
      success: true,
      notification
    });
  } catch (err) {
    next(err);
  }
}

// Mark all notifications as read
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );

    return res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (err) {
    next(err);
  }
}

// Delete notification
async function deleteNotification(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { id } = req.params;
    const deleted = await Notification.destroy({
      where: { notificationId: id, userId }
    });

    if (deleted === 0) {
      return fail(res, "Notification not found", 404);
    }

    return res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (err) {
    next(err);
  }
}

// Create notification (internal use)
async function createNotification(userId, type, title, message, actionUrl = null, metadata = null) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata
    });

    // Emit real-time notification via Socket.IO
    try {
      const { getIo } = require("../socket/socketServer");
      const io = getIo();
      io.to(`user:${userId}`).emit("new_notification", { notification });
    } catch (_) {
      // Socket.IO not yet initialised
    }

    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};
