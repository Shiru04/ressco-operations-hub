import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  apiAnalyticsOrders,
  apiAnalyticsProductionOverview,
  apiAnalyticsProductionQueues,
  apiAnalyticsProductionUsers,
  apiOrderCosting,
} from "../../api/analytics.api";
import KpiGauges from "./components/KpiGauges";

function canViewDashboard(role) {
  return role === "admin" || role === "supervisor" || role === "sales";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  const [overview, setOverview] = useState(null);
  const [queues, setQueues] = useState(null);
  const [users, setUsers] = useState(null);
  const [orders, setOrders] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [costingOpen, setCostingOpen] = useState(false);
  const [costing, setCosting] = useState(null);
  const [costingErr, setCostingErr] = useState("");
  const [costingLoading, setCostingLoading] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to]);

  const ordersParams = useMemo(() => {
    const p = { ...params };
    if (status) p.status = status;
    return p;
  }, [params, status]);

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const [a, b, c, d] = await Promise.all([
        apiAnalyticsProductionOverview(params),
        apiAnalyticsProductionQueues(params),
        apiAnalyticsProductionUsers(params),
        apiAnalyticsOrders(ordersParams),
      ]);
      setOverview(a);
      setQueues(b);
      setUsers(c);
      setOrders(d);
    } catch (e) {
      setErr(
        `${e.code || "ERROR"}: ${e.message || "Failed to load dashboard"}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(); // default backend last-30d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCosting(orderId) {
    setCostingErr("");
    setCosting(null);
    setCostingOpen(true);
    setCostingLoading(true);
    try {
      const r = await apiOrderCosting(orderId);
      setCosting(r);
    } catch (e) {
      setCostingErr(
        `${e.code || "ERROR"}: ${e.message || "Failed to load costing"}`
      );
    } finally {
      setCostingLoading(false);
    }
  }

  const queueCols = useMemo(
    () => [
      { field: "queueKey", headerName: "Queue", width: 220 },
      { field: "wipPieces", headerName: "WIP Pieces", width: 140 },
      { field: "laborHours", headerName: "Labor Hours", width: 140 },
      { field: "sessions", headerName: "Work Sessions", width: 150 },
    ],
    []
  );

  const userCols = useMemo(
    () => [
      { field: "name", headerName: "Name", width: 220 },
      { field: "email", headerName: "Email", width: 260 },
      { field: "laborHours", headerName: "Labor Hours", width: 160 },
      { field: "sessions", headerName: "Work Sessions", width: 160 },
    ],
    []
  );

  const orderCols = useMemo(
    () => [
      { field: "orderNumber", headerName: "Order #", width: 170 },
      { field: "status", headerName: "Status", width: 140 },
      { field: "laborHours", headerName: "Labor Hours", width: 140 },
      { field: "sessions", headerName: "Sessions", width: 120 },
      { field: "leadHours", headerName: "Lead (hrs)", width: 130 },
      { field: "cycleHours", headerName: "Cycle (hrs)", width: 130 },
      {
        field: "createdAt",
        headerName: "Created",
        width: 190,
        valueFormatter: ({ value }) =>
          value ? new Date(value).toLocaleString() : "",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 190,
        valueFormatter: ({ value }) =>
          value ? new Date(value).toLocaleString() : "",
      },
    ],
    []
  );

  const costingItemCols = useMemo(
    () => [
      { field: "typeCode", headerName: "Type", width: 140 },
      { field: "qty", headerName: "Qty", width: 90 },
      { field: "pieceStatus", headerName: "Queue", width: 140 },
      {
        field: "assignedToName",
        headerName: "Assigned To",
        width: 240,
      },

      { field: "laborHours", headerName: "Labor (hrs)", width: 130 },
      { field: "sessions", headerName: "Sessions", width: 110 },
    ],
    []
  );

  if (!canViewDashboard(user?.role)) {
    return (
      <Alert severity="error">You do not have access to the dashboard.</Alert>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Server-derived KPIs (workLog + audit status events). Default range
            is last 30 days (max 180).
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Order Status"
            size="small"
            select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="received">received</MenuItem>
            <MenuItem value="in_progress">in_progress</MenuItem>
            <MenuItem value="approved">approved</MenuItem>
            <MenuItem value="completed">completed</MenuItem>
            <MenuItem value="cancelled">cancelled</MenuItem>
          </TextField>

          <Button variant="contained" onClick={loadAll} disabled={loading}>
            Apply
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <KpiGauges kpis={overview?.kpis} />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Queue Metrics
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ height: 420, width: "100%" }}>
              <DataGrid
                rows={(queues?.rows || []).map((r, i) => ({
                  id: `${r.queueKey}-${i}`,
                  ...r,
                }))}
                columns={queueCols}
                loading={loading}
                disableRowSelectionOnClick
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              User Labor Metrics
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ height: 420, width: "100%" }}>
              <DataGrid
                rows={(users?.rows || []).map((r, i) => ({
                  id: `${r.userId || "unknown"}-${i}`,
                  ...r,
                }))}
                columns={userCols}
                loading={loading}
                disableRowSelectionOnClick
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Orders (Double-click = open order, Click = job costing)
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={orders?.items || []}
              columns={orderCols}
              getRowId={(r) => r.id}
              loading={loading}
              disableRowSelectionOnClick
              onRowDoubleClick={(p) => navigate(`/orders/${p.row.id}`)}
              onRowClick={(p) => openCosting(p.row.id)}
            />
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Costing is labor-only (server authoritative). Materials can be
            layered later when inventory exists.
          </Typography>
        </CardContent>
      </Card>

      <Dialog
        open={costingOpen}
        onClose={() => setCostingOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Job Costing</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          {costingErr ? <Alert severity="error">{costingErr}</Alert> : null}
          {costingLoading ? (
            <Alert severity="info">Loading costing…</Alert>
          ) : null}

          {costing ? (
            <>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>
                  {costing.orderNumber} ({costing.status})
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total labor hours: {costing.totals?.laborHours ?? 0}
                </Typography>
              </Box>

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Pieces
              </Typography>
              <Box sx={{ height: 360, width: "100%" }}>
                <DataGrid
                  rows={(costing.items || []).map((x, i) => ({
                    id: x.itemId || `${i}`,
                    ...x,
                  }))}
                  columns={costingItemCols}
                  disableRowSelectionOnClick
                />
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCostingOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
