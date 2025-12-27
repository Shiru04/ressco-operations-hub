// frontend/src/components/ui/ToastProvider.jsx
import { SnackbarProvider } from "notistack";

export default function ToastProvider({ children }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={3000}
    >
      {children}
    </SnackbarProvider>
  );
}
