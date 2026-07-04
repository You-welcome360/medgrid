import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, Socket } from 'socket.io';
import { getMeFromAuthService } from './clients/auth';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  // JWT Auth Middleware using gateway loopback auth call
  io.use(async (socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Missing token'));
    }

    try {
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const response = await getMeFromAuthService(formattedToken, undefined);
      
      if (!response.body.success || !response.body.data) {
        return next(new Error('Invalid token'));
      }

      (socket as any).user = response.body.data;
      next();
    } catch (err: any) {
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const facilityId: string | undefined = user?.facilityId;

    // Join facility room
    if (facilityId) {
      socket.join(`facility:${facilityId}`);
    }

    // Super admins join global room
    if (user?.role === 'SUPER_ADMIN') {
      socket.join('super_admin');
    }

    socket.on('disconnect', () => {
      // cleanup handled automatically by Socket.IO
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

/** Emit to a specific room */
export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(room).emit(event, data);
}
