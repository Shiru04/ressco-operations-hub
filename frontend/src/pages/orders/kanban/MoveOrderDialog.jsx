import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";

export default function MoveOrderDialog({
  open,
  onClose,
  onConfirm,
  order,
  fromStatus,
  toStatus,
  isAdmin,
}) {
  const [note, setNote] = useState("");
  const [unapprove, setUnapprove] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setUnapprove(false);
  }, [open]);

  const showUnapprove = useMemo(() => {
    // Only relevant when moving back to received
    return (
      isAdmin &&
      toStatus === "received" &&
      (fromStatus === "approved" || fromStatus === "in_progress")
    );
  }, [isAdmin, toStatus, fromStatus]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Confirm move</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
        <Typography sx={{ fontWeight: 800 }}>
          {order?.orderNumber || "Order"}: {fromStatus} → {toStatus}
        </Typography>

        <Alert severity="info">
          Add a note for audit traceability (recommended).
        </Alert>

        <TextField
          label="Note (audit)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          placeholder="Why are we moving this order?"
        />

        {showUnapprove ? (
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={unapprove}
                  onChange={(e) => setUnapprove(e.target.checked)}
                />
              }
              label="Unapprove (admin only) — clears approvals before setting status to received"
            />
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm({ note, unapprove })}
        >
          Confirm Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}
