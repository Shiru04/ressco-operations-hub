import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { apiCreateOrder } from "../../api/orders.api";
import { apiListCustomers } from "../../api/customers.api";

export default function CreateOrderDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [slaHoursTarget, setSlaHoursTarget] = useState(48);
  const [notes, setNotes] = useState("");

  async function loadCustomers() {
    try {
      const res = await apiListCustomers({
        q: customerQuery,
        page: 1,
        limit: 50,
      });
      setCustomers(res.items || []);
    } catch (e) {
      // keep silent; not fatal
    }
  }

  useEffect(() => {
    if (!open) return;
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadCustomers(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId || c._id === customerId),
    [customers, customerId]
  );

  async function submit() {
    setErr("");
    if (!customerId) {
      setErr("Customer is required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        source: "pos",
        customerId,
        priority,
        sla: { hoursTarget: Number(slaHoursTarget) || 48 },
        notes: notes || "",
      };

      const created = await apiCreateOrder(payload);

      // Optional: you can prefill takeoff header.customer from customer name later in Takeoff tab
      onCreated(created);
      onClose();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Order (POS)</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
        {err ? <Alert severity="error">{err}</Alert> : null}

        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Create the order first, then add Takeoff lines and generate the PDF.
        </Typography>

        <TextField
          label="Search customers"
          value={customerQuery}
          onChange={(e) => setCustomerQuery(e.target.value)}
          size="small"
        />

        <TextField
          select
          label="Customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        >
          {(customers || []).map((c) => (
            <MenuItem key={c.id || c._id} value={c.id || c._id}>
              {c.name || c.businessName || "Customer"} —{" "}
              {String(c.id || c._id).slice(-6)}
            </MenuItem>
          ))}
        </TextField>

        {selectedCustomer ? (
          <Alert severity="info">
            Selected:{" "}
            <b>{selectedCustomer.name || selectedCustomer.businessName}</b>
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="low">low</MenuItem>
            <MenuItem value="normal">normal</MenuItem>
            <MenuItem value="high">high</MenuItem>
            <MenuItem value="critical">critical</MenuItem>
          </TextField>

          <TextField
            label="SLA Hours Target"
            type="number"
            value={slaHoursTarget}
            onChange={(e) => setSlaHoursTarget(e.target.value)}
          />
        </Box>

        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={submit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : null}
          Create Order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
