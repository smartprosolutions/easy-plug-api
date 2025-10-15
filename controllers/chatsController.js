const { chats: Chat, chatMessages: ChatMessage } = require("../models");
const { success, fail } = require('../utils/response');

// create or return existing chat between buyer and seller for a listing
async function createOrGetChat(req, res, next) {
  try {
    const { listingId, sellerId } = req.body;
    const buyerId = req.user && req.user.id;
      if (!buyerId) return fail(res, 'User not authenticated', 401);
    if (!listingId || !sellerId)
        return fail(res, 'listingId and sellerId required', 400);

    // try to find existing chat
    let chat = await Chat.findOne({ where: { listingId, buyerId, sellerId } });
    if (!chat) {
      chat = await Chat.create({ listingId, buyerId, sellerId });
    }
      return success(res, { chat });
  } catch (err) {
    next(err);
  }
}

// list chats for authenticated user
async function listChats(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, 'User not authenticated', 401);
    const items = await Chat.findAll({ where: { [require('sequelize').Op.or]: [{ buyerId: userId }, { sellerId: userId }] } });
    return success(res, { chats: items });
  } catch (err) {
    next(err);
  }
}

// get chat and its messages
async function getChat(req, res, next) {
  try {
    const { id } = req.params;
    const chat = await Chat.findByPk(id);
    if (!chat)
      return fail(res, 'Chat not found', 404);
    const messages = await ChatMessage.findAll({ where: { chatId: chat.chatId }, order: [['createdAt', 'ASC']] });
    return success(res, { chat, messages });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrGetChat, listChats, getChat };
