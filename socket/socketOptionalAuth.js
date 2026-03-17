"use strict";

/**
 * Optional Socket.IO authentication middleware.
 *
 * If a valid JWT is present in socket.handshake.auth.token the socket is
 * treated as authenticated: socket.user = { id, email }.
 *
 * If no token is provided (or the token is invalid) the connection is still
 * allowed as anonymous: socket.user = null, socket.anonId = <uuid>.
 *
 * Used by the /location namespace so public viewers can connect without logging in.
 */

const jwt = require("jsonwebtoken");
const { users } = require("../models");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

async function socketOptionalAuth(socket, next) {
  const raw = socket.handshake.auth?.token;

  if (!raw) {
    socket.user = null;
    socket.anonId = crypto.randomUUID();
    return next();
  }

  try {
    const token = String(raw).replace(/^Bearer\s+/i, "").trim();
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await users.findByPk(payload.id);
    if (user) {
      socket.user = { id: user.userId, email: user.email };
    } else {
      socket.user = null;
      socket.anonId = crypto.randomUUID();
    }
  } catch {
    // Invalid token — treat as anonymous
    socket.user = null;
    socket.anonId = crypto.randomUUID();
  }

  next();
}

module.exports = socketOptionalAuth;
