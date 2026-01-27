import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../app/providers/AuthProvider";
import AssignmentIcon from "@mui/icons-material/Assignment";
import NotificationsBell from "./NotificationsBell";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

const FULL_DRAWER = 240;
const MINI_DRAWER = 72;

export default function AppShell() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearSession } = useAuth();

  const drawerWidth = useMemo(
    () => (isMdUp ? (collapsed ? MINI_DRAWER : FULL_DRAWER) : FULL_DRAWER),
    [isMdUp, collapsed]
  );

  // ==========================
  // TOP NAVIGATION (MAIN)
  // ==========================
  const navItems = useMemo(() => {
    const items = [
      { label: "Customers", icon: <PeopleAltIcon />, path: "/customers" },
      { label: "Orders", icon: <AssignmentIcon />, path: "/orders" },
    ];

    if (["admin", "supervisor", "production", "sales"].includes(user?.role)) {
      items.push({
        label: "Inventory",
        icon: <Inventory2OutlinedIcon />,
        path: "/inventory/materials",
      });
    }

    if (["admin", "supervisor", "sales"].includes(user?.role)) {
      items.push({
        label: "Dashboard",
        icon: <DashboardIcon />,
        path: "/dashboard",
      });
    }

    if (user?.role === "admin") {
      items.push({
        label: "Production Queues",
        icon: <SettingsIcon />,
        path: "/admin/production-queues",
      });
      items.push({
        label: "Users",
        icon: <AdminPanelSettingsIcon />,
        path: "/admin/users",
      });
      items.push({
        label: "Inventory Settings",
        icon: <SettingsIcon />,
        path: "/inventory/settings",
      });
    }

    return items;
  }, [user?.role]);

  // ==========================
  // DRAWER CONTENT
  // ==========================
  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        {!collapsed ? (
          <>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                Ressco Hub
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                {user?.email}
              </Typography>
            </Box>
            {isMdUp && (
              <IconButton size="small" onClick={() => setCollapsed(true)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}
          </>
        ) : (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              R
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* MAIN NAV */}
      <List sx={{ px: 1, pt: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);

          const button = (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? "auto" : 40,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      {/* PUSH BOTTOM */}
      <Box sx={{ flex: 1 }} />

      <Divider />

      {/* PROFILE (BOTTOM) */}
      <List sx={{ px: 1, pt: 1 }}>
        {(() => {
          const active = location.pathname.startsWith("/profile");

          const button = (
            <ListItemButton
              onClick={() => {
                navigate("/profile");
                setMobileOpen(false);
              }}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? "auto" : 40,
                  justifyContent: "center",
                }}
              >
                <AccountBoxIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Profile" />}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip title="Profile" placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })()}
      </List>

      {/* SIGN OUT */}
      <Box sx={{ p: 1.5 }}>
        {!collapsed ? (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        ) : (
          <Tooltip title="Sign out" placement="right">
            <IconButton
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
              sx={{ width: "100%" }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  // ==========================
  // LAYOUT
  // ==========================
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => {
              if (isMdUp) setCollapsed((v) => !v);
              else setMobileOpen((v) => !v);
            }}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 800 }}>
            Operations Hub
          </Typography>

          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {user?.role}
          </Typography>
          <NotificationsBell />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48 }} />
        {drawerContent}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: FULL_DRAWER },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          pt: 7,
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
