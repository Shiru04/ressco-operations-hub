import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import {
  apiGetMyNotifications,
  apiMarkAllRead,
  apiMarkOneRead,
} from "../api/notifications.api";
import { useAuth } from "../app/providers/AuthProvider";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();

  /* ----------------------------
     State
  -----------------------------*/

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notifications:sound") === "true";
  });

  const socketRef = useRef(null);

  const SOCKET_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  /* ----------------------------
     Persist sound preference
  -----------------------------*/

  useEffect(() => {
    localStorage.setItem("notifications:sound", String(soundEnabled));
  }, [soundEnabled]);

  /* ----------------------------
     Normalize roles (IMPORTANT)
  -----------------------------*/

  const roleNames = useMemo(() => {
    if (!user) return [];

    // Backend sends single role
    if (typeof user.role === "string") {
      return [user.role];
    }

    // Future-proofing if roles array is ever added
    if (Array.isArray(user.roles)) {
      return user.roles
        .map((r) => {
          if (typeof r === "string") return r;
          if (typeof r === "object" && r?.name) return r.name;
          return null;
        })
        .filter(Boolean);
    }

    return [];
  }, [user]);

  /* ----------------------------
     Derived state
  -----------------------------*/

  const unreadCount = useMemo(() => {
    if (!Array.isArray(items) || !user?.id) return 0;

    return items.filter(
      (n) => !Array.isArray(n.readBy) || !n.readBy.includes(user.id)
    ).length;
  }, [items, user?.id]);

  /* ----------------------------
     Initial fetch
  -----------------------------*/

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await apiGetMyNotifications();
        const normalizedItems = Array.isArray(data?.items) ? data.items : [];

        if (mounted) setItems(normalizedItems);
      } catch (err) {
        console.error("[Notifications] fetch failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  /* ----------------------------
     Socket lifecycle
  -----------------------------*/

  useEffect(() => {
    if (!user || socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", async () => {
      console.info("[Notifications] socket connected");
      console.info("[Notifications] joining roles:", roleNames);

      if (roleNames.length) {
        socket.emit("joinRoles", roleNames);
      }

      // Pull missed notifications after reconnect
      try {
        const data = await apiGetMyNotifications();
        const normalizedItems = Array.isArray(data?.items) ? data.items : [];
        setItems(normalizedItems);
      } catch (err) {
        console.error("[Notifications] refetch on connect failed", err);
      }
    });

    socket.on("notification:new", (notification) => {
      console.info("[Notifications] realtime notification", notification);

      setItems((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });

      if (soundEnabled) {
        new Audio("/sounds/notification.mp3").play().catch(() => {});
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Notifications] socket disconnected", reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, SOCKET_URL, roleNames, soundEnabled]);

  /* ----------------------------
     Actions
  -----------------------------*/

  const markOneRead = async (id) => {
    await apiMarkOneRead(id);

    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readBy: [...(n.readBy || []), user.id] } : n
      )
    );
  };

  const markAllRead = async () => {
    await apiMarkAllRead();

    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        readBy: [...new Set([...(n.readBy || []), user.id])],
      }))
    );
  };

  /* ----------------------------
     Context value
  -----------------------------*/

  const value = {
    items,
    unreadCount,
    loading,
    markOneRead,
    markAllRead,
    soundEnabled,
    setSoundEnabled,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);

  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }

  return ctx;
}
