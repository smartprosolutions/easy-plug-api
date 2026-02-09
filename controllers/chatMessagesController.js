const { chatMessages: ChatMessage, chats: Chat, listings: Listing, users: User } = require('../models');
const { success, fail } = require('../utils/response');
const { createNotification } = require('./notificationsController');

// send a message in a chat (chat should exist or be created by caller)
async function sendMessage(req, res, next) {
	try {
		const senderId = req.user && req.user.id;
		if (!senderId) return fail(res, 'User not authenticated', 401);
		const { chatId, message, receiverId } = req.body;
		if (!chatId || !message) return fail(res, 'chatId and message required', 400);

		const chat = await Chat.findByPk(chatId);
		if (!chat) return fail(res, 'Chat not found', 404);

		const created = await ChatMessage.create({ chatId, senderId, receiverId, message, isRead: false, createdAt: new Date() });

		// Get sender and listing info for notification
		const sender = await User.findByPk(senderId, {
			attributes: ['userId', 'firstName', 'lastName']
		});
		const listing = await Listing.findByPk(chat.listingId, {
			attributes: ['listingId', 'title']
		});

		// Create notification for receiver
		if (receiverId && sender && listing) {
			await createNotification(
				receiverId,
				'message',
				'New Message',
				`${sender.firstName} ${sender.lastName} sent you a message about "${listing.title}"`,
				`/chats/${chatId}`,
				{
					chatId,
					senderId,
					senderName: `${sender.firstName} ${sender.lastName}`,
					listingId: listing.listingId,
					listingTitle: listing.title,
					messagePreview: message.substring(0, 100)
				}
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
		const limit = parseInt(req.query.limit || '100', 10);
		const offset = parseInt(req.query.offset || '0', 10);
		const items = await ChatMessage.findAll({ where: { chatId }, order: [['createdAt', 'ASC']], limit, offset });
		return success(res, { messages: items });
	} catch (err) {
		next(err);
	}
}

// mark a message as read
async function markAsRead(req, res, next) {
	try {
		const { id } = req.params; // message id
		const msg = await ChatMessage.findByPk(id);
		if (!msg) return fail(res, 'Message not found', 404);
		msg.isRead = true;
		await msg.save();
		return success(res, { message: msg });
	} catch (err) {
		next(err);
	}
}

module.exports = { sendMessage, listMessages, markAsRead };
