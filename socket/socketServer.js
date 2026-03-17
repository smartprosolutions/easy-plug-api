const { Server } = require("socket.io");
const socketAuth = require("./socketAuth");
const socketOptionalAuth = require("./socketOptionalAuth");

let io;

// ─── In-memory location session state ────────────────────────────────────────
// token → { expiresAt, timer, ownerSocketId, ownerPos, viewers: Map<socketId, pos> }
const locationSessions = new Map();

async function expireLocationSession(token, locationNs) {
  const sess = locationSessions.get(token);
  if (!sess) return;
  clearTimeout(sess.timer);
  locationNs.to(`ls:${token}`).emit("session:expired");
  locationSessions.delete(token);
  // Deactivate in DB (lazy require to avoid circular deps)
  try {
    const { locationShare } = require("../models");
    await locationShare.update({ isActive: false }, { where: { token } });
  } catch (err) {
    console.error("[location] DB expire error:", err.message);
  }
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Each authenticated user joins their personal room for notifications
    socket.join(`user:${userId}`);

    socket.on("join_chat", (chatId) => {
      if (chatId) socket.join(`chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });
  });

  // ─── /location namespace (optional auth — anonymous viewers allowed) ─────
  const locationNs = io.of("/location");
  locationNs.use(socketOptionalAuth);

  locationNs.on("connection", (socket) => {
    socket.on("join", async ({ token } = {}) => {
      if (!token) {
        socket.emit("error", { message: "token required" });
        return;
      }

      try {
        const { locationShare } = require("../models");
        const share = await locationShare.findOne({ where: { token, isActive: true } });

        if (!share || new Date(share.expiresAt) <= new Date()) {
          socket.emit("error", { message: "Session not found or expired" });
          return;
        }

        const isOwner =
          socket.user && String(socket.user.id) === String(share.userId);

        socket.join(`ls:${token}`);
        socket.data = { token, role: isOwner ? "owner" : "viewer" };

        // Bootstrap in-memory session on first join
        if (!locationSessions.has(token)) {
          const delay = new Date(share.expiresAt) - Date.now();
          const timer = setTimeout(
            () => expireLocationSession(token, locationNs),
            Math.max(delay, 0),
          );
          locationSessions.set(token, {
            expiresAt: share.expiresAt,
            timer,
            ownerSocketId: null,
            ownerPos: null,
            viewers: new Map(),
          });
        }

        const sess = locationSessions.get(token);

        if (isOwner) {
          sess.ownerSocketId = socket.id;
        } else {
          sess.viewers.set(socket.id, null);
        }

        socket.emit("joined", {
          role: isOwner ? "owner_same_device" : "viewer",
          expiresAt: share.expiresAt,
          viewerCount: sess.viewers.size,
        });

        locationNs
          .to(`ls:${token}`)
          .emit("viewer:count", { count: sess.viewers.size });

        // Send cached owner position to new viewer immediately
        if (!isOwner && sess.ownerPos) {
          socket.emit("owner:pos", sess.ownerPos);
        }
      } catch (err) {
        console.error("[location] join error:", err.message);
        socket.emit("error", { message: "Server error" });
      }
    });

    socket.on("pos:update", ({ lat, lng, accuracy } = {}) => {
      const { token, role } = socket.data || {};
      if (!token || !locationSessions.has(token)) return;

      const sess = locationSessions.get(token);
      const payload = { lat, lng, accuracy, ts: Date.now() };

      if (role === "owner") {
        sess.ownerPos = payload;
        locationNs.to(`ls:${token}`).emit("owner:pos", payload);
      } else {
        sess.viewers.set(socket.id, payload);
        locationNs
          .to(`ls:${token}`)
          .emit("viewer:pos", { viewerId: socket.id, ...payload });
      }
    });

    socket.on("stop", async () => {
      const { token, role } = socket.data || {};
      if (!token || role !== "owner") return;

      const sess = locationSessions.get(token);
      if (sess) {
        clearTimeout(sess.timer);
        locationSessions.delete(token);
      }

      locationNs.to(`ls:${token}`).emit("session:stopped");

      try {
        const { locationShare } = require("../models");
        await locationShare.update({ isActive: false }, { where: { token } });
      } catch (err) {
        console.error("[location] stop error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      const { token, role } = socket.data || {};
      if (!token || role === "owner") return;

      const sess = locationSessions.get(token);
      if (!sess) return;
      sess.viewers.delete(socket.id);
      const count = sess.viewers.size;
      locationNs.to(`ls:${token}`).emit("viewer:count", { count });
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initSocket, getIo };
