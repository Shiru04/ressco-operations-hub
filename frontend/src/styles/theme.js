import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ffd60a" },
    background: {
      default: "#0c0c0c",
      paper: "#111827",
    },
    text: {
      primary: "#f3f4f6",
      secondary: "rgba(243,244,246,0.72)",
    },
  },
  typography: {
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
});
