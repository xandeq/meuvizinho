"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useAuthStore } from "@/lib/auth";

// Phase 4 Plan 02: SHARED SignalR hub singleton.
// Both the notifications bell (Phase 3) and the chat UI (Phase 4) must reuse
// the same HubConnection instance — do NOT construct `new HubConnectionBuilder()`
// anywhere else in the codebase. Use `getHubConnection()` below.

export interface NotificationHubOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let _connection: HubConnection | null = null;
let _startPromise: Promise<HubConnection> | null = null;

function buildConnection(): HubConnection {
  const url = `${API_BASE.replace(/\/$/, "")}/hubs/notifications`;
  return new HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

/**
 * Get (or lazily start) the single shared HubConnection for notifications + chat.
 * Safe to call multiple times — returns the same instance.
 */
export async function getHubConnection(): Promise<HubConnection> {
  if (_connection && _connection.state === HubConnectionState.Connected) {
    return _connection;
  }
  if (_startPromise) return _startPromise;

  if (!_connection) {
    _connection = buildConnection();
  }

  _startPromise = (async () => {
    try {
      if (_connection!.state === HubConnectionState.Disconnected) {
        await _connection!.start();
      }
      return _connection!;
    } catch (err) {
      throw err;
    } finally {
      // Always clear so subsequent calls re-evaluate connection state
      // instead of returning a stale resolved promise.
      _startPromise = null;
    }
  })();

  return _startPromise;
}

/** Test / logout helper — tears down the singleton. */
export async function resetHubConnection(): Promise<void> {
  if (_connection) {
    try {
      await _connection.stop();
    } catch {
      // best-effort
    }
  }
  _connection = null;
  _startPromise = null;
}

/**
 * Legacy factory kept for backward-compat with Phase 3 NotificationBell.
 * @deprecated Use getHubConnection() instead.
 */
export function createNotificationHub(
  _opts: NotificationHubOptions
): HubConnection {
  // Return a fresh (unstarted) connection for callers that still want explicit lifecycle.
  // New code should use `getHubConnection()` so connections are shared.
  return buildConnection();
}
