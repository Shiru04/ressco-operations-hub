import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { apiGetMyNotifications } from "../api/notifications.api";
import { useAuth } from "../app/providers/AuthProvider";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user, token } = useAuth();

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // sound policy: default off until user enables
  const [soundEnabled, setSoundEnabled] = useState(false);

  // to satisfy autoplay restrictions: only play after user interaction
  const userInteractedRef = useRef(false);
  const audioRef = useRef(null);

  useEffect(() => {
    function markInteracted() {
      userInteractedRef.current = true;
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    }
    window.addEventListener("pointerdown", markInteracted);
    window.addEventListener("keydown", markInteracted);
    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
    audioRef.current.preload = "auto";
  }, []);

  async function refresh() {
    if (!token) return;
    const data = await apiGetMyNotifications(50);
    setItems(data.items || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !user?.role) return;

    // Use same origin as frontend by default; set VITE_API_BASE_URL if needed
    const socket = io(import.meta.env.VITE_API_SOCKET_URL || "/", {
      transports: ["websocket"],
      auth: { token }, // optional; we won't enforce server-side in v1
    });

    socket.on("connect", () => {
      socket.emit("joinRoles", [user.role]);
    });

    socket.on("notification:new", (n) => {
      setItems((prev) => [n, ...prev].slice(0, 200));
      setUnreadCount((c) => c + 1);

      if (soundEnabled && userInteractedRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    });

    return () => socket.disconnect();
  }, [token, user?.role, soundEnabled]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      setUnreadCount,
      setItems,
      soundEnabled,
      setSoundEnabled,
      refresh,
    }),
    [items, unreadCount, soundEnabled]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}
