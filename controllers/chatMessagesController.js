const {
  chatMessages: ChatMessage,
  chats: Chat,
  listings: Listing,
  users: User,
} = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { success, fail } = require("../utils/response");
const { createNotification } = require("./notificationsController");

const getUploadFileFromRequest = (req) => {
  if (!req.files) return null;
  const candidates = ["attachment", "file", "document", "media", "image"];
  for (const key of candidates) {
    if (!req.files[key]) continue;
    return Array.isArray(req.files[key]) ? req.files[key][0] : req.files[key];
  }
  return null;
};

const saveChatAttachment = async (fileObj, chatId) => {
  if (!fileObj) return null;
  const folderName = "chat_files";
  const targetDir = path.join(process.cwd(), "uploads", folderName, String(chatId));
  fs.mkdirSync(targetDir, { recursive: true });

  const base = fileObj.name || "file";
  const safe = `${Date.now()}-${base.replace(/[^a-z0-9.\-_]/gi, "_")}`;
  const fullPath = path.join(targetDir, safe);
  await new Promise((resolve, reject) =>
    fileObj.mv(fullPath, (err) => (err ? reject(err) : resolve())),
  );

  return {
    fileName: base,
    fileSize: Number(fileObj.size || 0),
    mimeType: String(fileObj.mimetype || ""),
    fileUrl: `/uploads/${folderName}/${encodeURIComponent(String(chatId))}/${encodeURIComponent(safe)}`,
  };
};

const parseLocationFromBody = (body = {}) => {
  const rawLat =
    body?.location?.lat ??
    body?.location?.latitude ??
    body?.latitude ??
    body?.lat ??
    body?.locationLat;
  const rawLng =
    body?.location?.lng ??
    body?.location?.lon ??
    body?.location?.longitude ??
    body?.longitude ??
    body?.lng ??
    body?.locationLng;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (
    rawLat === undefined ||
    rawLat === null ||
    rawLat === "" ||
    rawLng === undefined ||
    rawLng === null ||
    rawLng === "" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    return null;
  return {
    lat,
    lng,
    name:
      body?.location?.name ||
      body?.locationName ||
      (typeof body?.message === "string" ? body.message.replace(/^📍\s*/, "") : ""),
  };
};

const parseReplyFromBody = (body = {}) => {
  const replyRaw =
    body?.replyTo ||
    body?.reply_to ||
    body?.repliedTo ||
    body?.replied_to ||
    body?.quotedMessage ||
    body?.quoted_message ||
    body?.reply ||
    null;

  const replyObj = replyRaw && typeof replyRaw === "object" ? replyRaw : null;
  const parentMessageId = Number(
    replyObj?.messageId ||
      replyObj?.message_id ||
      replyObj?.id ||
      replyObj?._id ||
      body?.replyToId ||
      body?.reply_to_id ||
      body?.repliedToId ||
      body?.quotedMessageId ||
      body?.parentMessageId ||
      body?.parent_message_id ||
      replyRaw ||
      0,
  );

  const replyText =
    (replyObj
      ? replyObj?.text ||
        replyObj?.message ||
        replyObj?.content ||
        replyObj?.body ||
        ""
      : "") ||
    body?.replyText ||
    body?.reply_text ||
    body?.quotedText ||
    "";

  const replySenderId =
    (replyObj
      ? replyObj?.senderId ||
        replyObj?.sender_id ||
        replyObj?.sender?.userId ||
        replyObj?.sender?.id ||
        null
      : null) ||
    body?.replySenderId ||
    body?.reply_sender_id ||
    body?.quotedSenderId ||
    null;

  if (!Number.isFinite(parentMessageId) && !replyText && !replySenderId) {
    return null;
  }

  return {
    parentMessageId: Number.isFinite(parentMessageId) && parentMessageId > 0 ? parentMessageId : null,
    replyText: replyText || null,
    replySenderId: replySenderId || null,
  };
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );

// send a message in a chat (chat should exist or be created by caller)
async function sendMessage(req, res, next) {
  try {
    const senderId = req.user && req.user.id;
    if (!senderId) return fail(res, "User not authenticated", 401);
    const { chatId, message, receiverId } = req.body;
    const uploadFile = getUploadFileFromRequest(req);
    const location = parseLocationFromBody(req.body);
    const reply = parseReplyFromBody(req.body);
    if (!chatId || (!message && !uploadFile))
      return fail(res, "chatId and message or attachment required", 400);

    const chat = await Chat.findOne({
      where: {
        [Op.or]: [{ id: chatId }, { chatId }],
      },
    });
    if (!chat) return fail(res, "Chat not found", 404);
    const resolvedChatId = chat.chatId || chat.id;

    const attachment = await saveChatAttachment(uploadFile, resolvedChatId);
    const normalizedMessage = message || (attachment ? `📎 ${attachment.fileName}` : "");

    let resolvedReply = reply;
    if (reply?.parentMessageId && (!reply?.replyText || !reply?.replySenderId)) {
      const parentMessage = await ChatMessage.findOne({
        where: {
          chatId: resolvedChatId,
          [Op.or]: [{ id: reply.parentMessageId }, { messageId: reply.parentMessageId }],
        },
        attributes: ["id", "messageId", "message", "senderId"],
      });
      if (parentMessage) {
        resolvedReply = {
          parentMessageId: parentMessage.id || parentMessage.messageId,
          replyText: reply?.replyText || parentMessage.message || null,
          replySenderId: reply?.replySenderId || parentMessage.senderId || null,
        };
      }
    }

    if (resolvedReply) {
      let normalizedReplySenderId = resolvedReply.replySenderId;
      if (normalizedReplySenderId === "me") {
        normalizedReplySenderId = senderId;
      } else if (normalizedReplySenderId === "other") {
        normalizedReplySenderId = receiverId || null;
      }
      if (normalizedReplySenderId && !isUuid(normalizedReplySenderId)) {
        normalizedReplySenderId = null;
      }
      resolvedReply = {
        ...resolvedReply,
        replySenderId: normalizedReplySenderId || null,
      };
    }

    const created = await ChatMessage.create({
      chatId: resolvedChatId,
      senderId,
      receiverId,
      message: normalizedMessage,
      imaages: attachment?.fileUrl ? [attachment.fileUrl] : undefined,
      messageType:
        req.body?.messageType ||
        (attachment ? "attachment" : location ? "location" : "text"),
      fileUrl: attachment?.fileUrl || null,
      fileName: attachment?.fileName || null,
      fileSize: attachment?.fileSize || null,
      mimeType: attachment?.mimeType || null,
      locationLat: location?.lat ?? null,
      locationLng: location?.lng ?? null,
      locationName: location?.name || req.body?.locationName || null,
      parentMessageId: resolvedReply?.parentMessageId || null,
      replyText: resolvedReply?.replyText || null,
      replySenderId: resolvedReply?.replySenderId || null,
      isRead: false,
    });

    const createdPayload = created.get({ plain: true });
    if (attachment) {
      createdPayload.fileUrl = attachment.fileUrl;
      createdPayload.fileName = attachment.fileName;
      createdPayload.fileSize = attachment.fileSize;
      createdPayload.mimeType = attachment.mimeType;
      createdPayload.attachment = {
        name: attachment.fileName,
        size: attachment.fileSize,
        mimeType: attachment.mimeType,
        url: attachment.fileUrl,
      };
    }
    if (location) {
      createdPayload.location = {
        lat: location.lat,
        lng: location.lng,
        name: location.name || null,
      };
    }
    if (createdPayload?.parentMessageId || createdPayload?.replyText) {
      createdPayload.replyTo = {
        messageId: createdPayload.parentMessageId || null,
        text: createdPayload.replyText || "",
        senderId: createdPayload.replySenderId || null,
      };
    }

    // Get sender and listing info for notification
    const sender = await User.findByPk(senderId, {
      attributes: ["userId", "firstName", "lastName"],
    });
    const listing = await Listing.findByPk(chat.listingId, {
      attributes: ["listingId", "title"],
    });

    // Create notification for receiver
    let notification = null;
    if (receiverId && sender && listing) {
      notification = await createNotification(
        receiverId,
        "message",
        "New Message",
        `${sender.firstName} ${sender.lastName} sent you a message about "${listing.title}"`,
        `/chats/${resolvedChatId}`,
        {
          chatId: resolvedChatId,
          senderId,
          senderName: `${sender.firstName} ${sender.lastName}`,
          listingId: listing.listingId,
          listingTitle: listing.title,
          messagePreview: normalizedMessage.substring(0, 100),
        },
      );
    }

    // Emit real-time events via Socket.IO
    try {
      const { getIo } = require("../socket/socketServer");
      const io = getIo();
      io.to(`chat:${resolvedChatId}`).emit("new_message", { message: createdPayload });
      if (notification && receiverId) {
        io.to(`user:${receiverId}`).emit("new_notification", { notification });
      }
    } catch (_) {
      // Socket.IO not available; REST response already sent
    }

    return success(res, { message: createdPayload }, 201);
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
    const normalized = items.map((item) => {
      const plain = item.get({ plain: true });
      const fileUrl =
        plain?.fileUrl ||
        plain?.imaages?.[0] ||
        plain?.images?.[0] ||
        plain?.attachment?.url ||
        "";
      const hasLocation =
        plain?.locationLat !== undefined &&
        plain?.locationLat !== null &&
        plain?.locationLat !== "" &&
        plain?.locationLng !== undefined &&
        plain?.locationLng !== null &&
        plain?.locationLng !== "" &&
        Number.isFinite(Number(plain?.locationLat)) &&
        Number.isFinite(Number(plain?.locationLng));
      const base = {
        ...plain,
        ...(hasLocation
          ? {
              location: {
                lat: Number(plain.locationLat),
                lng: Number(plain.locationLng),
                name: plain.locationName || null,
              },
            }
          : {}),
        ...(plain?.parentMessageId || plain?.replyText
          ? {
              replyTo: {
                messageId: plain.parentMessageId || null,
                text: plain.replyText || "",
                senderId: plain.replySenderId || null,
              },
            }
          : {}),
      };
      if (!fileUrl) return base;
      const fileName = path.basename(String(fileUrl));
      return {
        ...base,
        fileUrl,
        fileName,
        attachment: {
          name: fileName,
          size: plain?.fileSize || 0,
          mimeType: plain?.mimeType || "",
          url: fileUrl,
        },
      };
    });
    return success(res, { messages: normalized });
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

// unread messages total for authenticated user
async function getUnreadMessageCount(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return fail(res, "User not authenticated", 401);

    const chats = await Chat.findAll({
      where: {
        [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
      },
      attributes: ["id", "chatId"],
    });

    const chatIds = chats
      .flatMap((chat) => [chat.id, chat.chatId])
      .filter((chatId) => chatId != null);

    if (chatIds.length === 0) {
      return success(res, { unreadCount: 0 });
    }

    const unreadCount = await ChatMessage.count({
      where: {
        chatId: { [Op.in]: chatIds },
        senderId: { [Op.ne]: userId },
        [Op.and]: [
          { [Op.or]: [{ isRead: false }, { isRead: null }] },
          { [Op.or]: [{ receiverId: userId }, { receiverId: null }] },
        ],
      },
    });

    return success(res, { unreadCount });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendMessage,
  listMessages,
  markAsRead,
  getUnreadMessageCount,
};
