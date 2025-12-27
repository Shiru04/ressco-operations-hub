import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiApproveOrder,
  apiGetOrder,
  apiPatchOrderStatus,
} from "../../api/orders.api";
import { useAuth } from "../../app/providers/AuthProvider";
import TakeoffBuilder from "./takeoff/TakeoffBuilder";
import PiecesBoard from "./pieces/PiecesBoard";

function StatusChip({ value }) {
  const v = value || "received";
  return <Chip size="small" label={v} />;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState(0);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");

  const canApprove = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user]
  );
  const canStatusChange = canApprove;

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const o = await apiGetOrder(id);
      setOrder(o);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function approve() {
    setErr("");
    setLoading(true);
    try {
      const updated = await apiApproveOrder(id);
      setOrder(updated);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus() {
    setErr("");
    setLoading(true);
    try {
      const updated = await apiPatchOrderStatus(id, {
        status: nextStatus,
        note: note || undefined,
      });
      setOrder(updated);
      setNextStatus("");
      setNote("");
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (err) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="error">{err}</Alert>
        <Button variant="outlined" onClick={() => navigate("/orders")}>
          Back
        </Button>
      </Box>
    );
  }

  if (!order) return null;

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
            {order.orderNumber}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
              mt: 0.5,
            }}
          >
            <StatusChip value={order.status} />
            <Chip size="small" label={`source: ${order.source}`} />
            <Chip size="small" label={`priority: ${order.priority}`} />
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Updated:{" "}
              {order.updatedAt
                ? new Date(order.updatedAt).toLocaleString()
                : ""}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate("/orders")}>
            Back
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Overview" />
            <Tab label="Approval & Status" />
            <Tab label="Takeoff (POS)" />
            <Tab label="Pieces Board" />
          </Tabs>
          <Divider />

          <Box sx={{ p: 2 }}>
            {tab === 0 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Overview
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Customer ID: {String(order.customerId || "—")}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  SLA hours target: {order?.sla?.hoursTarget ?? 48}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Due:{" "}
                  {order?.sla?.dueAt
                    ? new Date(order.sla.dueAt).toLocaleString()
                    : "—"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.85, whiteSpace: "pre-wrap" }}
                >
                  Notes: {order.notes || "—"}
                </Typography>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: "grid", gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Approval & Status
                </Typography>

                <Alert severity="info">
                  Correct flow: approve first, then move status to{" "}
                  <b>approved</b>.
                </Alert>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Button
                    variant="contained"
                    disabled={!canApprove || loading}
                    onClick={approve}
                  >
                    Approve (Supervisor)
                  </Button>

                  <TextField
                    label="Next status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    size="small"
                    placeholder="approved / in_progress / completed"
                    sx={{ minWidth: 220 }}
                  />
                  <TextField
                    label="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    size="small"
                    sx={{ minWidth: 260, flex: 1 }}
                  />

                  <Button
                    variant="outlined"
                    disabled={!canStatusChange || loading || !nextStatus}
                    onClick={changeStatus}
                  >
                    Change Status
                  </Button>
                </Box>

                <Box sx={{ display: "grid", gap: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Approvals required: {order?.approvals?.required ?? 1}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Approved by: {(order?.approvals?.approvedBy || []).length}
                  </Typography>
                </Box>
              </Box>
            )}

            {tab === 2 && (
              <TakeoffBuilder
                orderId={order.id}
                initialTakeoff={order.takeoff || { header: {}, items: [] }}
                onSaved={(takeoff) => {
                  setOrder((prev) => ({ ...prev, takeoff }));
                }}
              />
            )}
            {tab === 3 && <PiecesBoard order={order} />}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
