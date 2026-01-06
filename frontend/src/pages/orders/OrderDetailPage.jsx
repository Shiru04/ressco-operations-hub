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
  apiGetOrder,
  apiPatchOrderStatus,
  apiGetTakeoffPdfBlob,
  apiGetInvoicePdfBlob,
  apiGetPackingSlipPdfBlob,
  apiGetCompletionReportPdfBlob,
} from "../../api/orders.api";
import { apiListAuditEvents } from "../../api/audit.api";
import { useAuth } from "../../app/providers/AuthProvider";
import TakeoffBuilder from "./takeoff/TakeoffBuilder";
import PiecesBoard from "./pieces/PiecesBoard";
import OrderAttachmentsPanel from "./attachments/OrderAttachmentsPanel";
import { apiListUsers } from "../../api/users.api";
import OrderMaterialsTab from "./materials/OrderMaterialsTab";

function StatusChip({ value }) {
  const v = value || "received";
  return <Chip size="small" label={v} />;
}

function shortId(v) {
  const s = String(v || "");
  return s.length > 8 ? s.slice(-6) : s;
}

function buildItemNameMap(order) {
  const map = {};
  const items = order?.takeoff?.items || [];
  for (const it of items) {
    const id = it?.pieceUid || it?.id || it?._id;
    if (!id) continue;
    map[String(id)] =
      it?.pieceRef ||
      it?.itemLabel ||
      it?.label ||
      it?.name ||
      `Piece ${shortId(id)}`;
  }
  return map;
}

function formatAuditLine(item, itemNameMap) {
  const action = item?.action || "";
  const c = item?.changes || {};
  const who = item?.actorName || item?.actorRole || "System";
  const when = item?.at ? new Date(item.at).toLocaleString() : "";

  const itemId =
    c?.itemId || c?.entityId || c?.pieceUid || c?.attachmentId || "";

  const itemLabel =
    c?.itemLabel ||
    c?.pieceRef ||
    (itemId ? itemNameMap?.[String(itemId)] : "") ||
    (itemId ? `Item ${shortId(itemId)}` : "Item");

  switch (action) {
    case "order_create":
      return `Order created`;
    case "order_status":
      return `Status changed: ${c.from || "—"} → ${c.to || "—"} (${who})`;
    case "piece_timer_start":
      return `${itemLabel}: Timer started (${who})`;
    case "piece_timer_pause":
      return `${itemLabel}: Timer paused (${who})`;
    case "piece_timer_resume":
      return `${itemLabel}: Timer resumed (${who})`;
    case "piece_timer_stop":
      return `${itemLabel}: Timer stopped (${who})`;
    case "takeoff_patch": {
      const headerChanged = Boolean(c["takeoff.header"]);
      const itemsCount = Number(c["takeoff.items.count"] || 0);

      if (headerChanged && itemsCount > 0) {
        return `Takeoff updated: header changed, ${itemsCount} item${
          itemsCount > 1 ? "s" : ""
        } updated (${who})`;
      }
      if (headerChanged) return `Takeoff header updated (${who})`;
      if (itemsCount > 0)
        return `Takeoff items updated (${itemsCount} item${
          itemsCount > 1 ? "s" : ""
        }) (${who})`;
      return `Takeoff updated (${who})`;
    }
    case "attachment_upload":
      return `Attachment uploaded: ${c.originalName || "file"} (${who})`;
    case "attachment_delete":
      return `Attachment deleted: ${c.originalName || "file"} (${who})`;
    case "attachment_update_meta":
      return `Attachment metadata updated (${who})`;
    default:
      return `${action || "event"} ${when ? `(${when})` : ""}`;
  }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // keeping (may be used for role gating later)

  const [tab, setTab] = useState(0);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [newStatus, setNewStatus] = useState("");

  // Audit state (kept same structure as ZIP)
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditErr, setAuditErr] = useState("");
  const [usersById, setUsersById] = useState({});

  const itemNameMap = useMemo(() => buildItemNameMap(order), [order]);

  const auditCols = useMemo(
    () => [
      {
        field: "at",
        headerName: "Time",
        width: 190,
        valueFormatter: (v) => (v ? new Date(v).toLocaleString() : ""),
      },
      {
        field: "actorUserId",
        headerName: "Actor",
        width: 200,
        valueGetter: (_v, row) => {
          const id = row?.actorUserId;
          if (!id) return row?.actorName || row?.actorRole || "System";
          const u = usersById?.[String(id)];
          return u
            ? `${u.name || u.email || String(id)}`
            : row?.actorName || row?.actorRole || String(id);
        },
      },
      {
        field: "action",
        headerName: "Action",
        width: 170,
        valueFormatter: (v) => v || "—",
      },
      {
        field: "summary",
        headerName: "Summary",
        flex: 1,
        minWidth: 420,
        valueGetter: (_v, row) => formatAuditLine(row, itemNameMap),
      },
    ],
    [usersById, itemNameMap]
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const o = await apiGetOrder(id);
      setOrder({ ...o, id: o.id || o._id });
      setNewStatus(o.status || "");
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsersIfNeeded() {
    try {
      // Only for History readability; do not block if it fails.
      const list = await apiListUsers();
      const map = {};
      for (const u of list || []) {
        map[String(u.id || u._id)] = u;
      }
      setUsersById(map);
    } catch {
      // ignore
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

  async function onDownloadPdf(kind) {
    if (!order?.id) return;
    setErr("");
    setLoading(true);
    try {
      if (kind === "takeoff") {
        const blob = await apiGetTakeoffPdfBlob(order.id);
        downloadBlob(blob, `${order.orderNumber || "order"}-takeoff.pdf`);
      } else if (kind === "invoice") {
        const blob = await apiGetInvoicePdfBlob(order.id);
        downloadBlob(blob, `${order.orderNumber || "order"}-invoice.pdf`);
      } else if (kind === "packing") {
        const blob = await apiGetPackingSlipPdfBlob(order.id);
        downloadBlob(blob, `${order.orderNumber || "order"}-packing-slip.pdf`);
      } else if (kind === "completion") {
        const blob = await apiGetCompletionReportPdfBlob(order.id);
        downloadBlob(
          blob,
          `${order.orderNumber || "order"}-completion-report.pdf`
        );
      }
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

  // History tab is now index 5 (Attachments inserted at index 4)
  useEffect(() => {
    if (tab === 5 && order?.id) {
      loadUsersIfNeeded();
      loadAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, order?.id]);

  async function saveStatus() {
    if (!order?.id) return;
    setErr("");
    setLoading(true);
    try {
      // Safer: backend expects { status }
      const updated = await apiPatchOrderStatus(order.id, {
        status: newStatus,
      });
      setOrder((prev) => ({ ...prev, ...updated }));
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

  // CRITICAL: ensure Takeoff calls never use undefined orderId
  const resolvedOrderId = order?.id || order?._id || id;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {order.orderNumber || "Order"}{" "}
            <Chip size="small" label={order.status || "received"} />
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Created:{" "}
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
          </Typography>
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
            <Tab label="Attachments" />
            <Tab label="History" />
            <Tab label="Order Materials"></Tab>
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

                <Card variant="outlined">
                  <CardContent sx={{ display: "grid", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Documents (PDF)
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Downloads use authenticated requests (no public links).
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        variant="outlined"
                        onClick={() => onDownloadPdf("takeoff")}
                        disabled={loading}
                      >
                        Takeoff PDF
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => onDownloadPdf("invoice")}
                        disabled={loading}
                      >
                        Invoice PDF
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => onDownloadPdf("packing")}
                        disabled={loading}
                      >
                        Packing Slip PDF
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => onDownloadPdf("completion")}
                        disabled={loading}
                      >
                        Completion Report PDF
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: "grid", gap: 1.5, maxWidth: 520 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Approval & Status
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Current status: <StatusChip value={order.status} />
                </Typography>

                <TextField
                  label="Set status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  size="small"
                />

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={saveStatus}
                    disabled={loading}
                  >
                    Save
                  </Button>
                </Box>

                <Alert severity="info">
                  Status transitions are controlled by server permissions. This
                  UI does not override backend rules.
                </Alert>
              </Box>
            )}

            {tab === 2 && (
              <TakeoffBuilder
                orderId={resolvedOrderId}
                initialTakeoff={order?.takeoff}
                onSaved={(takeoff) =>
                  setOrder((prev) => ({ ...prev, takeoff }))
                }
              />
            )}

            {tab === 3 && <PiecesBoard order={order} />}

            {tab === 4 && <OrderAttachmentsPanel order={order} />}

            {tab === 5 && (
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

                <Box sx={{ height: 560 }}>
                  <DataGrid
                    rows={(auditRows || []).map((x) => ({
                      ...x,
                      id: x.id || x._id,
                    }))}
                    columns={auditCols}
                    loading={auditLoading}
                    rowSelection={false}
                    disableRowSelectionOnClick
                  />
                </Box>

                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Tip: Actor names resolve via Users list when available.
                </Typography>
              </Box>
            )}
            {tab === 6 && <OrderMaterialsTab order={order} />}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
