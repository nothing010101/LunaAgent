// =============================================================================
// Socket.io client that connects to the ACP backend and dispatches events.
// Auto-reconnects with exponential backoff for 24/7 uptime.
// =============================================================================

import { io, type Socket } from "socket.io-client";
import { SocketEvent, type AcpJobEventData } from "./types.js";

export interface AcpSocketCallbacks {
  onNewTask: (data: AcpJobEventData) => void;
  onEvaluate?: (data: AcpJobEventData) => void;
}

export interface AcpSocketOptions {
  acpUrl: string;
  walletAddress: string;
  callbacks: AcpSocketCallbacks;
}

/**
 * Connect to the ACP socket and start listening for seller events.
 * Uses socket.io built-in reconnection with exponential backoff.
 * Returns a cleanup function that disconnects the socket.
 */
export function connectAcpSocket(opts: AcpSocketOptions): () => void {
  const { acpUrl, walletAddress, callbacks } = opts;

  const socket: Socket = io(acpUrl, {
    auth: { walletAddress },
    transports: ["websocket"],
    // Built-in auto-reconnect with exponential backoff
    reconnection: true,
    reconnectionAttempts: Infinity, // never give up
    reconnectionDelay: 1_000, // start at 1s
    reconnectionDelayMax: 30_000, // cap at 30s
    randomizationFactor: 0.3, // jitter to avoid thundering herd
    timeout: 20_000, // connection timeout per attempt
  });

  socket.on(SocketEvent.ROOM_JOINED, (_data: unknown, callback?: (ack: boolean) => void) => {
    console.log("[socket] Joined ACP room");
    if (typeof callback === "function") callback(true);
  });

  socket.on(SocketEvent.ON_NEW_TASK, (data: AcpJobEventData, callback?: (ack: boolean) => void) => {
    if (typeof callback === "function") callback(true);
    console.log(`[socket] onNewTask  jobId=${data.id}  phase=${data.phase}`);
    callbacks.onNewTask(data);
  });

  socket.on(SocketEvent.ON_EVALUATE, (data: AcpJobEventData, callback?: (ack: boolean) => void) => {
    if (typeof callback === "function") callback(true);
    console.log(`[socket] onEvaluate  jobId=${data.id}  phase=${data.phase}`);
    if (callbacks.onEvaluate) {
      callbacks.onEvaluate(data);
    }
  });

  socket.on("connect", () => {
    console.log("[socket] Connected to ACP");
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] Disconnected: ${reason}`);
    // socket.io will auto-reconnect unless reason is "io client disconnect"
    if (reason === "io server disconnect") {
      // Server forced disconnect — manually reconnect
      console.log("[socket] Server-initiated disconnect, reconnecting...");
      socket.connect();
    }
  });

  socket.on("reconnect", (attempt: number) => {
    console.log(`[socket] Reconnected after ${attempt} attempt(s)`);
  });

  socket.on("reconnect_attempt", (attempt: number) => {
    console.log(`[socket] Reconnect attempt #${attempt}...`);
  });

  socket.on("reconnect_error", (err: Error) => {
    console.error(`[socket] Reconnect error: ${err.message}`);
  });

  socket.on("reconnect_failed", () => {
    // Only fires if reconnectionAttempts is finite. We use Infinity so this
    // should never trigger, but guard just in case.
    console.error("[socket] All reconnect attempts failed — exiting so Railway can restart");
    process.exit(1);
  });

  socket.on("connect_error", (err) => {
    console.error(`[socket] Connection error: ${err.message}`);
    // socket.io will retry automatically
  });

  const disconnect = () => {
    socket.disconnect();
  };

  process.on("SIGINT", () => {
    disconnect();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    disconnect();
    process.exit(0);
  });

  return disconnect;
}
