const jwt = require("jsonwebtoken");
const { users } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    const normalizedToken = String(token)
      .replace(/^Bearer\s+/i, "")
      .trim();

    const payload = jwt.verify(normalizedToken, JWT_SECRET);
    const user = await users.findByPk(payload.id);
    if (!user) return next(new Error("User not found"));

    socket.user = { id: user.userId, email: user.email };
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
}

module.exports = socketAuth;
