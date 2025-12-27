import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "../../styles/theme";
import ToastProvider from "../../components/ui/ToastProvider";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { NotificationsProvider } from "../../context/NotificationsContext";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <NotificationsProvider> {children} </NotificationsProvider>
        </LocalizationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
