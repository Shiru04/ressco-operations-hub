import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./app/providers/AuthProvider";
import AppProviders from "./app/providers/AppProviders";
import AppRoutes from "./app/routes";

export default function App() {
  return (
    <AuthProvider>
      <AppProviders>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </AuthProvider>
  );
}
