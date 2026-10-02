import { Server } from "socket.io";
import { config } from "../config.js";

let io;
export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true }
  });
  io.on("connection", socket => {
    socket.on("join-workflow", id => socket.join(`workflow:${id}`));
    socket.on("leave-workflow", id => socket.leave(`workflow:${id}`));
  });
  return io;
}
export function emitWorkflow(id, event, payload = {}) {
  io?.to(`workflow:${id}`).emit(event, { workflowId: id, ...payload });
}
export function emitUser(userId, event, payload = {}) {
  io?.to(`user:${userId}`).emit(event, payload);
}
