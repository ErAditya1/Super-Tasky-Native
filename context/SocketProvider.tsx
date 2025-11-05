// src/providers/SocketProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import io, { Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { handleStatus } from "@/store/user/userSlice";

import {
  registerForPushNotificationsAsync,
  showLocalNotification,
  getSocketUriFromConstants,
} from "@/services/notification";

/** --- Types --- */
type NewMessagePayload = {
  from: string;
  message: string;
  title?: string;
  data?: any;
};

type UserOnlinePayload = {
  user: string;
  status: "online" | "offline" | "away";
};

/** --- Context --- */
const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
};

/** --- Socket creation --- */
const createSocket = (uri: string, token: string, deviceId: string): Socket => {
  // Use websocket transport to avoid polling on mobile
  return io(uri, {
    transports: ["websocket"],
    autoConnect: true,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: {
      token,
      deviceId,
    },
  });
};

/** --- Provider --- */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const dispatch = useAppDispatch();

  // Replace these selectors with your auth state
  const user = useAppSelector((s) => s.auth.user);
  const token = user?.accessToken ?? null;
  const userId = user?._id ?? null;

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const expoPushTokenRef = useRef<string | null>(null);

  // Connect / reconnect when token changes
  useEffect(() => {
    if (!token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      return;
    }

    const SOCKET_URI = getSocketUriFromConstants();
    const deviceId = Platform.OS + "-" + (userId ?? "anon");

    const sc = createSocket(SOCKET_URI, token, deviceId);

    // Unset previous then set new
    setSocket((prev) => {
      prev?.disconnect();
      return sc;
    });

    sc.on("connect", () => {
      console.log("✅ Socket connected", sc.id);
      // If we already have expoPushToken, register with server
      if (expoPushTokenRef.current) {
        sc.emit("REGISTER_PUSH_TOKEN", {
          userId,
          token: expoPushTokenRef.current,
        });
      }
    });

    sc.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    sc.on("connect_error", (err) => {
      console.warn("⚠️ Socket connect_error:", err?.message ?? err);
    });

    // Server events
    sc.on("CONNECTED_EVENT", () => {
      console.log("📡 CONNECTED_EVENT (server)");
    });

    sc.on("USER_ONLINE_EVENT", (payload: UserOnlinePayload) => {
      console.log("👤 USER_ONLINE_EVENT", payload);
      // Update store
      dispatch(handleStatus({ userId: payload.user, status: payload.status }));
      // Optionally show notification for status change
      // showLocalNotification({ title: "User status", body: `${payload.user} is ${payload.status}` });
    });

    sc.on("NEW_MESSAGE_EVENT", async (payload: NewMessagePayload) => {
      console.log("📨 NEW_MESSAGE_EVENT", payload);

      // Prefer explicit title/body from payload
      const title = payload.title ?? `Message from ${payload.from}`;
      const body = payload.message ?? "You have a new message";

      // Show a local (immediate) notification
      await showLocalNotification({ title, body, data: payload.data });

      // You can also update Redux store, persist message, etc here:
      // dispatch(addMessage(payload));
    });

    sc.on("SOCKET_ERROR_EVENT", (err: any) => {
      console.error("⚠️ SOCKET_ERROR_EVENT", err);
    });

    return () => {
      sc.removeAllListeners();
      sc.disconnect();
      console.log("🧹 Socket cleanup (effect)");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, dispatch]);

  // Register for push notifications, then send push token to server via socket
  useEffect(() => {
    let mounted = true;
    (async () => {
      const expoToken = await registerForPushNotificationsAsync();
      if (!mounted) return;
      expoPushTokenRef.current = expoToken;

      if (expoToken && socket && socket.connected) {
        socket.emit("REGISTER_PUSH_TOKEN", { userId, token: expoToken });
        console.log("➡️ Sent push token to server via socket");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [socket, userId]);

  // App state: disconnect in background to save data, reconnect in foreground
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      if (prev.match(/inactive|background/) && nextState === "active") {
        // foreground
        if (socket && !socket.connected) {
          console.log("🔄 Foreground — reconnecting socket");
          socket.connect();
        }
      } else if (prev === "active" && nextState.match(/inactive|background/)) {
        // background
        if (socket && socket.connected) {
          console.log("⏸️ Background — disconnecting socket");
          socket.disconnect();
        }
      }
    };

    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [socket]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
