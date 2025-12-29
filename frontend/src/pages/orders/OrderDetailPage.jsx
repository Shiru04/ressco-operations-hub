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
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiApproveOrder,
  apiGetOrder,
  apiPatchOrderStatus,
} from "../../api/orders.api";
import { apiListAuditEvents } from "../../api/audit.api";
import { useAuth } from "../../app/providers/AuthProvider";
import TakeoffBuilder from "./takeoff/TakeoffBuilder";
import PiecesBoard from "./pieces/PiecesBoard";
import { apiListUsers } from "../../api/users.api";

function StatusChip({ value }) {
  const v = value || "received";
  return <Chip size="small" label={v} />;
}

function shortId(v) {
  if (!v) return "—";
  const s = String(v);
  return s.length > 8 ? s.slice(-6) : s;
}

function secondsToHuman(sec) {
  const s = Math.max(0, Number(sec || 0));
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

function buildItemNameMap(order) {
  const map = {};
  const items = order?.takeoff?.items || [];

  for (const it of items) {
    const keys = [];

    // ✅ include stable identity (audit now uses this)
    if (it?.pieceUid) keys.push(String(it.pieceUid));

    // ✅ include mongo ids (back-compat)
    if (it?._id) keys.push(String(it._id));
    if (it?.id) keys.push(String(it.id));

    // optional: legacy client id if present
    if (it?.clientItemId) keys.push(String(it.clientItemId));

    // label: prefer pieceRef, else typeCode
    let label = it?.pieceRef || it?.typeCode || "Piece";
    if (it?.qty && it.qty > 1) label += ` (x${it.qty})`;
    if (it?.material) label += ` ${it.material}`;

    for (const k of keys) map[k] = label;
  }

  return map;
}

function formatAuditSummary(row, userMap, itemNameMap) {
  const action = row?.action || "";
  const c = row?.changes || {};

  const itemIdStr = c.itemId ? String(c.itemId) : null;
  const itemLabel = itemIdStr
    ? itemNameMap?.[itemIdStr] || `Piece ${shortId(itemIdStr)}`
    : "Piece";

  const nameFor = (id) => {
    if (!id) return null;
    return userMap?.[String(id)] || null;
  };

  switch (action) {
    case "order_status_changed": {
      const from = c.from || "—";
      const to = c.to || "—";
      const note = c.note ? ` (Note: ${c.note})` : "";
      return `Order status: ${from} → ${to}${note}`;
    }

    case "order_approved":
    case "order_approve":
      return "Order approved";

    case "piece_assign": {
      const q = c.assignedQueueKey || c.pieceStatus || "—";
      const assignedToName = nameFor(c.assignedTo);
      const assignedToText = c.assignedTo
        ? `Assigned to ${assignedToName || shortId(c.assignedTo)}`
        : "Unassigned";
      return `${itemLabel}: Queue ${q}. ${assignedToText}.`;
    }

    case "piece_timer_start":
      return `${itemLabel}: Timer started`;
    case "piece_timer_pause":
      return `${itemLabel}: Timer paused`;
    case "takeoff_patch": {
      const headerChanged = Boolean(c["takeoff.header"]);
      const itemsCount = Number(c["takeoff.items.count"] || 0);

      if (headerChanged && itemsCount > 0) {
        return `Takeoff updated: header changed, ${itemsCount} item${
          itemsCount > 1 ? "s" : ""
        } updated`;
      }

      if (headerChanged) {
        return "Takeoff header updated";
      }

      if (itemsCount > 0) {
        return `Takeoff items updated (${itemsCount} item${
          itemsCount > 1 ? "s" : ""
        })`;
      }

      return "Takeoff updated";
    }

    case "piece_timer_resume":
      return `${itemLabel}: Timer resumed`;
    case "piece_timer_stop":
      return `${itemLabel}: Timer stopped (${secondsToHuman(c.durationSec)})`;
    case "piece_status_change": {
      const from = c.from || "—";
      const to = c.to || "—";
      return `Assigned ${itemLabel}: Queue ${from} → ${to}`;
    }

    default: {
      const keys =
        c && typeof c === "object" ? Object.keys(c).filter(Boolean) : [];
      const hint = keys.length
        ? ` (${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""})`
        : "";
      return `${action || "event"}${hint}`;
    }
  }
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

  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditErr, setAuditErr] = useState("");

  const [userMap, setUserMap] = useState({});
  const [itemNameMap, setItemNameMap] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const res = await apiListUsers({ q: "", page: 1, limit: 500 });
        const items = res?.items || res || [];
        const map = {};
        for (const u of items) {
          map[String(u.id || u._id)] =
            u.name || u.email || shortId(u.id || u._id);
        }
        if (mounted) setUserMap(map);
      } catch {
        // silent fallback to short ids
      }
    }

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const canApprove = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user]
  );
  const canStatusChange = canApprove;

  const isPrivileged = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user]
  );

  const auditColumns = useMemo(() => {
    const cols = [
      {
        field: "at",
        headerName: "Time",
        width: 190,
        valueFormatter: (value) =>
          value ? new Date(value).toLocaleString() : "",
      },
      {
        field: "summary",
        headerName: "Summary",
        flex: 1,
        minWidth: 420,
        sortable: false,
        valueGetter: (_value, row) =>
          formatAuditSummary(row, userMap, itemNameMap),
      },
      { field: "action", headerName: "Action", width: 180 },
      {
        field: "actorRole",
        headerName: "Role",
        width: 130,
        valueFormatter: (value) => value || "—",
      },
      {
        field: "actorUserId",
        headerName: "Actor",
        width: 160,
        valueFormatter: (value) => (value ? shortId(value) : "system"),
      },
    ];

    if (isPrivileged) {
      cols.push({
        field: "changes",
        headerName: "Raw Changes",
        flex: 1,
        minWidth: 260,
        valueFormatter: (value) => {
          try {
            return JSON.stringify(value || {});
          } catch {
            return "";
          }
        },
      });
    }

    return cols;
  }, [isPrivileged, userMap, itemNameMap]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const o = await apiGetOrder(id);
      setOrder(o);
      setItemNameMap(buildItemNameMap(o));
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    if (!order?.id) return;
    setAuditErr("");
    setAuditLoading(true);
    try {
      const r = await apiListAuditEvents({
        entityType: "order",
        entityId: order.id,
        page: 1,
        limit: 200,
      });
      setAuditRows(r.items || []);
    } catch (e) {
      setAuditErr(`${e.code}: ${e.message}`);
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === 4 && order?.id) {
      loadAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, order?.id]);

  async function approve() {
    setErr("");
    setLoading(true);
    try {
      const updated = await apiApproveOrder(id);
      setOrder(updated);
      setItemNameMap(buildItemNameMap(updated));
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
      setItemNameMap(buildItemNameMap(updated));
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
            <Tab label="History" />
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
                onSaved={(takeoff) =>
                  setOrder((prev) => ({ ...prev, takeoff }))
                }
              />
            )}

            {tab === 3 && <PiecesBoard order={order} />}

            {tab === 4 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    History
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadAudit}
                    disabled={auditLoading}
                  >
                    Refresh
                  </Button>
                </Box>

                {auditErr ? <Alert severity="error">{auditErr}</Alert> : null}

                <Box sx={{ height: 520, width: "100%" }}>
                  <DataGrid
                    rows={auditRows}
                    columns={auditColumns}
                    getRowId={(r) => r.id}
                    loading={auditLoading}
                    disableRowSelectionOnClick
                  />
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
