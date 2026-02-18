const { Server } = require("socket.io");
const socketAuth = require("./socketAuth");

let io;

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

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initSocket, getIo };
