import React, { useState } from "react";
import {
  Badge,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
  Button,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationsContext";
import { apiMarkAllRead, apiMarkOneRead } from "../../api/notifications.api";

export default function NotificationsBell() {
  const navigate = useNavigate();
  const {
    items,
    unreadCount,
    setUnreadCount,
    setItems,
    soundEnabled,
    setSoundEnabled,
    refresh,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  async function markAll() {
    await apiMarkAllRead();
    // locally mark read
    setItems((prev) =>
      prev.map((n) => ({ ...n, readBy: [...(n.readBy || []), "me"] }))
    );
    setUnreadCount(0);
    await refresh().catch(() => {});
  }

  async function markOne(id) {
    await apiMarkOneRead(id);
    setUnreadCount((c) => Math.max(0, c - 1));
    await refresh().catch(() => {});
  }

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge color="primary" badgeContent={unreadCount} max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1, width: 360 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>Notifications</Typography>
            <Button size="small" onClick={markAll} disabled={unreadCount === 0}>
              Mark all read
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Sound on new orders
            </Typography>
            <Switch
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
          </Box>
        </Box>

        <Divider />

        {(items || []).slice(0, 12).map((n) => (
          <MenuItem
            key={n.id}
            onClick={async () => {
              setAnchorEl(null);
              if (n.entityType === "order" && n.entityId) {
                navigate(`/orders/${n.entityId}`);
              }
              await markOne(n.id).catch(() => {});
            }}
            sx={{ whiteSpace: "normal", alignItems: "flex-start" }}
          >
            <Box sx={{ display: "grid", gap: 0.25 }}>
              <Typography sx={{ fontWeight: 700 }}>{n.title}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {n.message}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
              </Typography>
            </Box>
          </MenuItem>
        ))}

        {(items || []).length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              No notifications yet.
            </Typography>
          </Box>
        ) : null}
      </Menu>
    </>
  );
}
