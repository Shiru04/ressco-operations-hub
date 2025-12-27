import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { apiListOrders } from "../../api/orders.api";
import AddIcon from "@mui/icons-material/Add";
import CreateOrderDialog from "./CreateOrderDialog";

function StatusChip({ value }) {
  const v = value || "received";
  return <Chip size="small" label={v} />;
}

export default function OrdersPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const location = useLocation();

  function getInitialTabFromQuery() {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam === "takeoff") return 2;
    if (tabParam === "status") return 1;
    if (tabParam === "overview") return 0;

    // allow numeric too: ?tab=2
    const n = Number(tabParam);
    if (Number.isFinite(n) && n >= 0 && n <= 2) return n;

    return 0;
  }
  const [tab, setTab] = useState(() => getInitialTabFromQuery());
  useEffect(() => {
    setTab(getInitialTabFromQuery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const columns = useMemo(
    () => [
      { field: "orderNumber", headerName: "Order #", width: 140 },
      { field: "source", headerName: "Source", width: 120 },
      {
        field: "status",
        headerName: "Status",
        width: 140,
        renderCell: (params) => <StatusChip value={params.row?.status} />,
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 120,
        valueGetter: (params) => params.row?.priority || "normal",
      },
      {
        field: "customerId",
        headerName: "Customer ID",
        flex: 1,
        minWidth: 220,
        valueGetter: (params) => params.row?.customerId || "—",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 180,
        valueGetter: (params) =>
          params.row?.updatedAt
            ? new Date(params.row.updatedAt).toLocaleString()
            : "",
      },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const result = await apiListOrders({
        q,
        status: status || "",
        page: page + 1,
        limit: pageSize,
      });
      setRows(result.items || []);
      setTotal(result.total || 0);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

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
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Orders
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            POS + Website intake. Supervisor approval then status transitions.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => load()}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Order
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label="Search (order #, contact)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              sx={{ minWidth: 260 }}
            />
            <TextField
              label="Status (optional)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
              placeholder="received"
            />
            <Button
              variant="contained"
              onClick={() => {
                setPage(0);
                load();
              }}
            >
              Search
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setQ("");
                setStatus("");
                setPage(0);
              }}
            >
              Clear
            </Button>
            <Button
              component={RouterLink}
              to="/orders/board"
              variant="outlined"
            >
              Board
            </Button>
          </Box>

          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[10, 25, 50, 100]}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => {
                setPage(m.page);
                setPageSize(m.pageSize);
              }}
              onRowClick={(params) => navigate(`/orders/${params.row.id}`)}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>
      <CreateOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => navigate(`/orders/${created.id}?tab=takeoff`)}
      />
    </Box>
  );
}
