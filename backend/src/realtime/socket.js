let io = null;

function initSocket(server, { corsOrigin }) {
  // lazy require to avoid issues in tests
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // client will "join" role rooms after auth
    socket.on("joinRoles", (roles = []) => {
      roles.forEach((r) => socket.join(`role:${r}`));
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initSocket, getIO };
