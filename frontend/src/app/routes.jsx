import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./providers/AuthProvider";

import LoginPage from "../pages/auth/LoginPage";
import CustomersPage from "../pages/customers/CustomersPage";
import CustomerDetailPage from "../pages/customers/CustomerDetailPage";
import AppShell from "../components/layout/AppShell";
import OrdersPage from "../pages/orders/OrdersPage";
import OrderDetailPage from "../pages/orders/OrderDetailPage";
import OrdersBoardPage from "../pages/orders/OrdersBoardPage";

function PrivateRoute({ children }) {
  const { isAuthed, booting } = useAuth();
  if (booting) return null;
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/customers" replace />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders/board" element={<OrdersBoardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
