import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { apiCreateCustomer, apiListCustomers } from "../../api/customers.api";
import CustomerFormDialog from "./CustomerFormDialog";

export default function CustomersPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(0); // DataGrid is 0-based
  const [pageSize, setPageSize] = useState(25);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Customer", flex: 1, minWidth: 220 },
      {
        field: "priority",
        headerName: "Priority",
        width: 130,
        valueFormatter: (_value, params) =>
          params?.row?.sla?.priority || "normal",
      },
      {
        field: "hoursTarget",
        headerName: "SLA (hrs)",
        width: 120,
        valueGetter: (_value, params) => params?.row?.sla?.hoursTarget ?? 48,
      },
      {
        field: "contacts",
        headerName: "Contacts",
        width: 110,
        valueFormatter: (_value, params) => params?.row?.contacts?.length || 0,
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 180,
        valueFormatter: (_value, params) =>
          params?.row?.updatedAt
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
      const result = await apiListCustomers({
        q,
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
            Customers
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            CRM base: contacts, SLA, priority, order history.
          </Typography>
        </Box>

        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          New Customer
        </Button>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              sx={{ minWidth: 260 }}
            />
            <Button
              variant="outlined"
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
                setPage(0);
              }}
            >
              Clear
            </Button>
          </Box>

          <Box sx={{ height: 560, width: "100%" }}>
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
              onRowClick={(params) => navigate(`/customers/${params.row.id}`)}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          setErr("");
          setLoading(true);
          try {
            await apiCreateCustomer(payload);
            setCreateOpen(false);
            setPage(0);
            await load();
          } catch (e) {
            setErr(`${e.code}: ${e.message}`);
          } finally {
            setLoading(false);
          }
        }}
      />
    </Box>
  );
}
