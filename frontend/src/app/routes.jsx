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
import ProductionQueuesPage from "../pages/admin/ProductionQueuesPage";
import UsersAdminPage from "../pages/admin/UsersAdminPage";
import ProductionDashboardPage from "../pages/dashboard/ProductionDashboardPage";
import UsersDashboardPage from "../pages/dashboard/UsersDashboardPage";
import JobCostingPage from "../pages/dashboard/JobCostingPage";

// NEW
import PortalShell from "../components/layout/PortalShell";
import PortalOrdersPage from "../pages/portal/PortalOrdersPage";
import PortalTakeoffRequestPage from "../pages/portal/PortalTakeoffRequestPage";

function PrivateRoute({ children }) {
  const { isAuthed, booting } = useAuth();
  if (booting) return null;
  return isAuthed ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ allow, children }) {
  const { user, booting } = useAuth();
  if (booting) return null;
  if (!user) return <Navigate to="/login" replace />;
  return allow.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Portal routes (customer role only) */}
      <Route
        path="/portal"
        element={
          <PrivateRoute>
            <RoleRoute allow={["customer"]}>
              <PortalShell />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<PortalOrdersPage />} />
        <Route path="new" element={<PortalTakeoffRequestPage />} />
      </Route>

      {/* Ops app */}
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
        <Route
          path="dashboard/production"
          element={<ProductionDashboardPage />}
        />
        <Route path="dashboard/users" element={<UsersDashboardPage />} />
        <Route path="dashboard/job-costing" element={<JobCostingPage />} />

        {/* Admin */}
        <Route
          path="admin/production-queues"
          element={<ProductionQueuesPage />}
        />
        <Route path="admin/users" element={<UsersAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
