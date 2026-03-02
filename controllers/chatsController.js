const {
  chats: Chat,
  chatMessages: ChatMessage,
  listings: Listing,
  users: User,
} = require("../models");
const { Op } = require("sequelize");
const { success, fail } = require("../utils/response");
const { createNotification } = require("./notificationsController");

// create or return existing chat between buyer and seller for a listing
async function createOrGetChat(req, res, next) {
  try {
    const { listingId, sellerId } = req.body;
    const buyerId = req.user && req.user.id;
    if (!buyerId) return fail(res, "User not authenticated", 401);
    if (!listingId || !sellerId)
      return fail(res, "listingId and sellerId required", 400);

    // try to find existing chat
    let isNewChat = false;
    let chat = await Chat.findOne({ where: { listingId, buyerId, sellerId } });
    if (!chat) {
      chat = await Chat.create({ listingId, buyerId, sellerId });
      isNewChat = true;
    }

    if (isNewChat && sellerId && sellerId !== buyerId) {
      const [buyer, listing] = await Promise.all([
        User.findByPk(buyerId, {
          attributes: ["userId", "firstName", "lastName"],
        }),
        Listing.findByPk(listingId, {
          attributes: ["listingId", "title"],
        }),
      ]);

      if (buyer && listing) {
        await createNotification(
          sellerId,
          "message",
          "New Chat Started",
          `${buyer.firstName} ${buyer.lastName} started a chat about "${listing.title}".`,
          `/chats/${chat.chatId || chat.id}`,
          {
            chatId: chat.chatId || chat.id,
            listingId,
            listingTitle: listing.title,
            buyerId,
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
          },
        );
      }
    }

    const chatPk = chat.chatId || chat.id;
    const enrichedChat = await Chat.findByPk(chatPk, {
      include: [
        {
          model: Listing,
        },
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] },
        },
      ],
    });

    return success(res, { chat: enrichedChat || chat });
  } catch (err) {
    next(err);
  }
}

// list chats for authenticated user
async function listChats(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const items = await Chat.findAll({
      where: {
        [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: [
        {
          model: Listing,
        },
        {
          model: User,
          as: "buyer",
          attributes: { exclude: ["passwordHash"] },
        },
        {
          model: User,
          as: "seller",
          attributes: { exclude: ["passwordHash"] },
        },
      ],
    });

    const chatIds = items
      .map((chat) => chat.chatId || chat.id)
      .filter((chatId) => chatId != null);
    const lastMessageByChat = new Map();
    const unreadCountByChat = new Map();

    if (chatIds.length > 0) {
      const [messages, unreadMessages] = await Promise.all([
        ChatMessage.findAll({
          where: { chatId: { [Op.in]: chatIds } },
          order: [
            ["chatId", "ASC"],
            ["createdAt", "DESC"],
          ],
        }),
        ChatMessage.findAll({
          where: {
            chatId: { [Op.in]: chatIds },
            isRead: false,
            senderId: { [Op.ne]: userId },
            [Op.or]: [{ receiverId: userId }, { receiverId: null }],
          },
          attributes: ["chatId"],
        }),
      ]);

      for (const message of messages) {
        if (!lastMessageByChat.has(message.chatId)) {
          lastMessageByChat.set(message.chatId, message);
        }
      }

      for (const message of unreadMessages) {
        const current = unreadCountByChat.get(message.chatId) || 0;
        unreadCountByChat.set(message.chatId, current + 1);
      }
    }

    const chats = items.map((chat) => {
      const plainChat = chat.toJSON();
      const chatPk = chat.chatId || chat.id;
      plainChat.lastMessage = lastMessageByChat.get(chatPk) || null;
      plainChat.unreadCount = unreadCountByChat.get(chatPk) || 0;
      return plainChat;
    });

    return success(res, { chats });
  } catch (err) {
    next(err);
  }
}

// get chat and its messages
async function getChat(req, res, next) {
  try {
    const { id } = req.params;
    const chat = await Chat.findByPk(id);
    if (!chat) return fail(res, "Chat not found", 404);
    const chatPk = chat.chatId || chat.id;
    const messages = await ChatMessage.findAll({
      where: { chatId: chatPk },
      order: [["createdAt", "ASC"]],
    });
    return success(res, { chat, messages });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrGetChat, listChats, getChat };
