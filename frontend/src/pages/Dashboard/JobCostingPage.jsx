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
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { apiAnalyticsOrders, apiOrderCosting } from "../../api/analytics.api";
import { useNavigate } from "react-router-dom";

export default function JobCostingPage() {
  const navigate = useNavigate();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [costingOpen, setCostingOpen] = useState(false);
  const [costing, setCosting] = useState(null);
  const [costingErr, setCostingErr] = useState("");
  const [costingLoading, setCostingLoading] = useState(false);

  const columns = useMemo(
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
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 190,
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "",
      },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await apiAnalyticsOrders(params);
      setData(r);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function openCosting(orderId) {
    setCostingErr("");
    setCosting(null);
    setCostingOpen(true);
    setCostingLoading(true);
    try {
      const r = await apiOrderCosting(orderId);
      setCosting(r);
    } catch (e) {
      setCostingErr(`${e.code}: ${e.message}`);
    } finally {
      setCostingLoading(false);
    }
  }

  const costingItemCols = useMemo(
    () => [
      { field: "typeCode", headerName: "Type", width: 140 },
      { field: "qty", headerName: "Qty", width: 90 },
      { field: "pieceStatus", headerName: "Queue", width: 140 },
      { field: "assignedTo", headerName: "Assigned To", width: 240 },
      { field: "laborHours", headerName: "Labor (hrs)", width: 130 },
      { field: "sessions", headerName: "Sessions", width: 110 },
    ],
    []
  );

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
            Job Costing
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Labor-only costing foundation (materials later with inventory).
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
          <Button variant="contained" onClick={load} disabled={loading}>
            Apply
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Orders
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={data?.items || []}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              disableRowSelectionOnClick
              onRowDoubleClick={(p) => navigate(`/orders/${p.row.id}`)}
              onRowClick={(p) => openCosting(p.row.id)}
            />
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Click row = costing; double-click = open order.
          </Typography>
        </CardContent>
      </Card>

      <Dialog
        open={costingOpen}
        onClose={() => setCostingOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Costing</DialogTitle>
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
                  rows={(costing.items || []).map((x) => ({
                    id: x.itemId,
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
