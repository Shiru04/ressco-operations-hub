import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "../../styles/theme";
import ToastProvider from "../../components/ui/ToastProvider";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { AuthProvider } from "../../app/providers/AuthProvider";
import { NotificationsProvider } from "../../context/NotificationsContext";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <AuthProvider>
            <NotificationsProvider>
              {children}
            </NotificationsProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
