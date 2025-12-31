import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../app/providers/AuthProvider";

export default function PortalShell() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography sx={{ flex: 1, fontWeight: 800 }}>
            Client Portal
          </Typography>
          <Button
            color="inherit"
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
