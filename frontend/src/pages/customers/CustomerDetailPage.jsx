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
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiCustomerOrders,
  apiGetCustomer,
  apiUpdateCustomer,
} from "../../api/customers.api";
import CustomerFormDialog from "./CustomerFormDialog";

function PriorityChip({ value }) {
  const v = value || "normal";
  return <Chip size="small" label={v} />;
}

function StatusChip({ value }) {
  const v = value || "received";
  return <Chip size="small" label={v} />;
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [err, setErr] = useState("");

  const [editOpen, setEditOpen] = useState(false);

  const orderColumns = useMemo(
    () => [
      {
        field: "orderNumber",
        headerName: "Order #",
        width: 150,
      },
      {
        field: "status",
        headerName: "Status",
        width: 160,
        renderCell: (params) => <StatusChip value={params.row?.status} />,
        sortable: false,
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 140,
        renderCell: (params) => (
          <PriorityChip value={params.row?.priority || "normal"} />
        ),
        sortable: false,
      },
      {
        field: "source",
        headerName: "Source",
        width: 140,
        renderCell: (params) => params.row?.source || "—",
        sortable: false,
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 190,
        valueFormatter: (_value, params) =>
          params.row?.createdAt
            ? new Date(params.row.createdAt).toLocaleString()
            : "",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 190,
        valueFormatter: (_value, params) =>
          params.row?.updatedAt
            ? new Date(params.row.updatedAt).toLocaleString()
            : "",
      },
    ],
    []
  );

  async function loadCustomer() {
    setErr("");
    setLoading(true);
    try {
      const c = await apiGetCustomer(id);
      setCustomer(c);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    setErr("");
    setOrdersLoading(true);
    try {
      const h = await apiCustomerOrders(id);
      setOrders(h?.items || []);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load orders when tab becomes Order History
  useEffect(() => {
    if (tab === 4) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (err) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="error">{err}</Alert>
        <Button variant="outlined" onClick={() => navigate("/customers")}>
          Back
        </Button>
      </Box>
    );
  }

  if (!customer) return null;

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
            {customer.name}
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
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              SLA: {customer?.sla?.hoursTarget ?? 48}h
            </Typography>
            <PriorityChip value={customer?.sla?.priority} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Updated:{" "}
              {customer?.updatedAt
                ? new Date(customer.updatedAt).toLocaleString()
                : ""}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate("/customers")}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => setEditOpen(true)}
            disabled={loading}
          >
            Edit
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
            <Tab label="Contacts" />
            <Tab label="SLA" />
            <Tab label="Notes" />
            <Tab label="Order History" />
          </Tabs>
          <Divider />

          <Box sx={{ p: 2 }}>
            {tab === 0 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Overview
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Contacts: {customer.contacts?.length || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Priority: {customer?.sla?.priority || "normal"}
                </Typography>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Contacts
                </Typography>
                {(customer.contacts || []).length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>
                    No contacts on file.
                  </Typography>
                ) : (
                  (customer.contacts || []).map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        p: 2,
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 2,
                        display: "grid",
                        gap: 0.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {c.title || "—"}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {c.email || "—"}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {c.phone || "—"}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            )}

            {tab === 2 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  SLA
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Hours target: {customer?.sla?.hoursTarget ?? 48}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Priority: {customer?.sla?.priority || "normal"}
                </Typography>
              </Box>
            )}

            {tab === 3 && (
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Notes
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.85, whiteSpace: "pre-wrap" }}
                >
                  {customer.notes || "—"}
                </Typography>
              </Box>
            )}

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
                    Order History
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadOrders}
                    disabled={ordersLoading}
                  >
                    Refresh
                  </Button>
                </Box>

                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total: {orders.length}
                </Typography>

                <Box sx={{ height: 520, width: "100%" }}>
                  <DataGrid
                    rows={orders}
                    columns={orderColumns}
                    getRowId={(r) => r.id}
                    loading={ordersLoading}
                    disableRowSelectionOnClick
                    onRowClick={(params) =>
                      navigate(`/orders/${params.row.id}`)
                    }
                  />
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={customer}
        onSubmit={async (payload) => {
          setErr("");
          setLoading(true);
          try {
            const updated = await apiUpdateCustomer(customer.id, payload);
            setCustomer(updated);
            setEditOpen(false);
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
