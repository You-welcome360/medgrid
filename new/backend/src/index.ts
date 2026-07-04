import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import authRoutes from "./modules/auth/auth.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import coordinationRoutes from "./modules/coordination/coordination.routes.js";
import facilityRoutes from "./modules/facility/facility.routes.js";
import webhookRoutes from "./modules/webhooks/webhooks.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import userRoutes from "./modules/user/user.routes.js";

import { initSocket } from "./config/socket.js";
import { startExpiryWorker } from "./services/expiry.worker.js";
import { env } from "./config/env.js";

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS — allow the Vite dev server and any configured production origin
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

// Capture raw body for Paystack webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Routes
app.use("/auth", authRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/coordination", coordinationRoutes);
app.use("/facility", facilityRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/notifications", notificationRoutes);
app.use("/user", userRoutes);

// Wrap Express in an HTTP server so Socket.IO can share the same port
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Start the emergency request expiry worker
startExpiryWorker();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down");
  httpServer.close(() => process.exit(0));
});

httpServer.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`WebSocket ready on ws://localhost:${env.PORT}`);
});
