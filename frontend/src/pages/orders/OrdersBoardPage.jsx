import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  apiApproveOrder,
  apiPatchOrderStatus,
  apiUnapproveOrder,
  apiListOrders,
} from "../../api/orders.api";
import MoveOrderDialog from "./kanban/MoveOrderDialog";
import OrderKanbanBoard from "./kanban/OrderKanbanBoard";
import { useAuth } from "../../app/providers/AuthProvider";

const DEFAULT_COLUMNS = [
  { key: "received", label: "Received" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default function OrdersBoardPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [orders, setOrders] = useState([]);

  const columns = DEFAULT_COLUMNS;

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canSupervisorFlow = ["admin", "supervisor"].includes(user?.role);

  const [pendingMove, setPendingMove] = useState(null);
  // pendingMove: { orderId, fromStatus, toStatus }

  const grouped = useMemo(() => {
    const map = {};
    columns.forEach((c) => (map[c.key] = []));
    for (const o of orders) {
      const st = o.status || "received";
      if (!map[st]) map[st] = [];
      map[st].push(o);
    }
    // stable sort: most recently updated first
    Object.keys(map).forEach((k) => {
      map[k] = map[k].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    });
    return map;
  }, [orders, columns]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      // For board: pull more items than list, keep it bounded
      const res = await apiListOrders({ page: 1, limit: 200 });
      setOrders(res.items || []);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function executeMove({
    orderId,
    fromStatus,
    toStatus,
    note,
    unapprove,
  }) {
    // optimistic UI
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: toStatus, updatedAt: new Date().toISOString() }
          : o
      )
    );

    try {
      // Admin-only: unapprove when moving to received and checkbox enabled
      if (toStatus === "received" && unapprove) {
        if (!isAdmin) {
          throw { code: "FORBIDDEN", message: "Only admins can unapprove." };
        }
        await apiUnapproveOrder(orderId);
        await apiPatchOrderStatus(orderId, {
          status: "received",
          note: note || "Unapproved and moved back to received (Kanban)",
        });
        return;
      }

      // Special case: moving to approved must respect backend approval rule
      if (toStatus === "approved") {
        if (!canSupervisorFlow) {
          throw {
            code: "FORBIDDEN",
            message: "Only supervisors/admin can approve orders.",
          };
        }
        await apiApproveOrder(orderId);
        await apiPatchOrderStatus(orderId, {
          status: "approved",
          note: note || `Moved ${fromStatus} → approved (Kanban)`,
        });
        return;
      }

      // Normal status move (including backwards)
      await apiPatchOrderStatus(orderId, {
        status: toStatus,
        note: note || `Moved ${fromStatus} → ${toStatus} (Kanban)`,
      });
    } catch (e) {
      setErr(`${e.code || "ERR"}: ${e.message || "Move failed"}`);
      await load(); // rollback safely
    }
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Active Orders Board
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Drag & drop orders between statuses to update production flow.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}
      {loading ? (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Loading orders…
        </Alert>
      ) : null}

      <OrderKanbanBoard
        columns={columns}
        groupedOrders={grouped}
        onMoveRequest={({ orderId, fromStatus, toStatus }) => {
          // Always allow backwards moves; confirmation will handle admin-only unapprove toggle
          setPendingMove({ orderId, fromStatus, toStatus });
        }}
      />
      <MoveOrderDialog
        open={!!pendingMove}
        onClose={() => setPendingMove(null)}
        order={orders.find((o) => o.id === pendingMove?.orderId)}
        fromStatus={pendingMove?.fromStatus}
        toStatus={pendingMove?.toStatus}
        isAdmin={isAdmin}
        onConfirm={async ({ note, unapprove }) => {
          const pm = pendingMove;
          setPendingMove(null);
          if (!pm) return;
          await executeMove({ ...pm, note, unapprove });
        }}
      />
    </Box>
  );
}
