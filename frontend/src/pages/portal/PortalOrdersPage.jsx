import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { apiPortalOrders } from "../../api/portal.api";

export default function PortalOrdersPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      { field: "orderNumber", headerName: "Order #", width: 180 },
      { field: "status", headerName: "Status", width: 160 },
      {
        field: "createdAt",
        headerName: "Created",
        width: 220,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString() : "",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 220,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString() : "",
      },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await apiPortalOrders();

        // Normalize ids (portal API returns "id", not "_id")
        const normalized = (Array.isArray(data) ? data : []).map((o) => ({
          ...o,
          id: o.id || o._id,
        }));

        if (!mounted) return;
        setRows(normalized);
      } catch (e) {
        if (!mounted) return;
        setErr(`${e.code || "ERROR"}: ${e.message || "Failed to load orders"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            My Orders
          </Typography>

          {/* IMPORTANT: use relative navigation inside /portal nested route */}
          <Button variant="contained" onClick={() => navigate("new")}>
            New Request
          </Button>
        </Box>

        {err ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {err}
          </Alert>
        ) : null}

        <Box sx={{ height: 440 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            // ✅ Robust: works whether row has id or _id
            getRowId={(r) => r.id || r._id}
            // ✅ Clicking a row opens status page
            onRowClick={(p) => {
              const id = p?.row?.id || p?.row?._id;
              if (id) navigate(`orders/${id}`);
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
