const {
  chatMessages: ChatMessage,
  chats: Chat,
  listings: Listing,
  users: User,
} = require("../models");
const { Op } = require("sequelize");
const { success, fail } = require("../utils/response");
const { createNotification } = require("./notificationsController");

// send a message in a chat (chat should exist or be created by caller)
async function sendMessage(req, res, next) {
  try {
    const senderId = req.user && req.user.id;
    if (!senderId) return fail(res, "User not authenticated", 401);
    const { chatId, message, receiverId } = req.body;
    if (!chatId || !message)
      return fail(res, "chatId and message required", 400);

    const chat = await Chat.findByPk(chatId);
    if (!chat) return fail(res, "Chat not found", 404);

    const created = await ChatMessage.create({
      chatId,
      senderId,
      receiverId,
      message,
      isRead: false,
      createdAt: new Date(),
    });

    // Get sender and listing info for notification
    const sender = await User.findByPk(senderId, {
      attributes: ["userId", "firstName", "lastName"],
    });
    const listing = await Listing.findByPk(chat.listingId, {
      attributes: ["listingId", "title"],
    });

    // Create notification for receiver
    if (receiverId && sender && listing) {
      await createNotification(
        receiverId,
        "message",
        "New Message",
        `${sender.firstName} ${sender.lastName} sent you a message about "${listing.title}"`,
        `/chats/${chatId}`,
        {
          chatId,
          senderId,
          senderName: `${sender.firstName} ${sender.lastName}`,
          listingId: listing.listingId,
          listingTitle: listing.title,
          messagePreview: message.substring(0, 100),
        },
      );
    }

    return success(res, { message: created }, 201);
  } catch (err) {
    next(err);
  }
}

// list messages by chat id (paginated optional)
async function listMessages(req, res, next) {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit || "100", 10);
    const offset = parseInt(req.query.offset || "0", 10);
    const items = await ChatMessage.findAll({
      where: { chatId },
      order: [["createdAt", "ASC"]],
      limit,
      offset,
    });
    return success(res, { messages: items });
  } catch (err) {
    next(err);
  }
}

// mark a message as read
async function markAsRead(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const { chatId } = req.params;

    if (chatId) {
      const chat = await Chat.findOne({
        where: {
          [Op.or]: [{ id: chatId }, { chatId }],
        },
        attributes: ["id", "chatId", "buyerId", "sellerId"],
      });

      if (!chat) return fail(res, "Chat not found", 404);

      if (chat.buyerId !== userId && chat.sellerId !== userId) {
        return fail(res, "Not authorized for this chat", 403);
      }

      const resolvedChatId = chat.chatId || chat.id;

      const [updatedCount] = await ChatMessage.update(
        { isRead: true },
        {
          where: {
            chatId: resolvedChatId,
            isRead: false,
            senderId: { [Op.ne]: userId },
            [Op.or]: [{ receiverId: userId }, { receiverId: null }],
          },
        },
      );

      return success(res, { chatId: resolvedChatId, updatedCount });
    }

    const { id } = req.params; // message id
    const msg = await ChatMessage.findByPk(id);
    if (!msg) return fail(res, "Message not found", 404);

    if (msg.senderId === userId) {
      return fail(res, "Cannot mark your own sent message as read", 403);
    }

    if (msg.receiverId && msg.receiverId !== userId) {
      return fail(res, "Not authorized for this message", 403);
    }

    msg.isRead = true;
    await msg.save();
    return success(res, { message: msg });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, listMessages, markAsRead };
