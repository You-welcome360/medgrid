import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Missing token"));
    }

    try {
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as any;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    const facilityId: string | undefined = user?.facility_id;

    // Join facility room so broadcasts are facility-scoped
    if (facilityId) {
      socket.join(`facility:${facilityId}`);
    }

    // Super admins join a global room
    if (user?.role === "SUPER_ADMIN") {
      socket.join("super_admin");
    }

    socket.on("disconnect", () => {
      // cleanup handled automatically by Socket.IO
    });
  });

  return io;
}

/** Emit to a specific facility room */
export function emitToFacility(facilityId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`facility:${facilityId}`).emit(event, data);
}

/** Emit to all facility rooms */
export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}

/** Emit to super admin room */
export function emitToSuperAdmins(event: string, data: unknown): void {
  if (!io) return;
  io.to("super_admin").emit(event, data);
}

export function getIO(): SocketServer | null {
  return io;
}
