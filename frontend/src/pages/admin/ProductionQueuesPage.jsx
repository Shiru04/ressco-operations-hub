import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  apiGetProductionBoard,
  apiUpdateProductionBoard,
} from "../../api/production.api";

function slugifyKey(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function ProductionQueuesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]); // local editable columns
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const canEdit = isAdmin;

  const hasDuplicateKeys = useMemo(() => {
    const keys = rows.map((r) => String(r.key || "").trim()).filter(Boolean);
    return new Set(keys).size !== keys.length;
  }, [rows]);

  async function load() {
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      const board = await apiGetProductionBoard();
      const cols = (board?.columns || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Normalize into editable rows (keep a stable client-only id for list operations)
      setRows(
        cols.map((c, idx) => ({
          _rowId: `${c.key}-${idx}`,
          key: c.key,
          label: c.label,
          order: c.order ?? idx + 1,
        }))
      );
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addRow() {
    setOkMsg("");
    setRows((prev) => [
      ...prev,
      {
        _rowId: `new-${Date.now()}`,
        key: "",
        label: "",
        order: prev.length + 1,
      },
    ]);
  }

  function removeRow(rowId) {
    setOkMsg("");
    setRows((prev) => {
      const next = prev.filter((r) => r._rowId !== rowId);
      return next.map((r, idx) => ({ ...r, order: idx + 1 }));
    });
  }

  function moveRow(rowId, dir) {
    setOkMsg("");
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._rowId === rowId);
      if (idx < 0) return prev;
      const next = prev.slice();
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[swapWith];
      next[swapWith] = tmp;
      return next.map((r, i) => ({ ...r, order: i + 1 }));
    });
  }

  function updateField(rowId, field, value) {
    setOkMsg("");
    setRows((prev) =>
      prev.map((r) => {
        if (r._rowId !== rowId) return r;

        if (field === "key") {
          // keep key safe; user can still type freely but we normalize on blur
          return { ...r, key: value };
        }
        return { ...r, [field]: value };
      })
    );
  }

  async function save() {
    setErr("");
    setOkMsg("");

    if (!canEdit) return;

    // Validate client-side
    const normalized = rows.map((r, idx) => ({
      key: String(r.key || "").trim(),
      label: String(r.label || "").trim(),
      order: idx + 1,
    }));

    if (normalized.some((c) => !c.key || !c.label)) {
      setErr("VALIDATION_ERROR: Each queue must have a key and label.");
      return;
    }
    if (hasDuplicateKeys) {
      setErr("VALIDATION_ERROR: Duplicate queue keys are not allowed.");
      return;
    }

    setSaving(true);
    try {
      await apiUpdateProductionBoard(normalized);
      setOkMsg("Saved.");
      await load(); // reload canonical ordering from server
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="error">Access denied. Admin only.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Production Queues
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Manage the columns used by the Pieces Kanban (queues). Keys must be
            unique.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={loading || saving || !canEdit || rows.length === 0}
          >
            Save
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}
      {okMsg ? <Alert severity="success">{okMsg}</Alert> : null}
      {hasDuplicateKeys ? (
        <Alert severity="warning">
          Duplicate keys detected. Fix before saving.
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Queues ({rows.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addRow}
              disabled={!canEdit || loading || saving}
            >
              Add queue
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: "grid", gap: 1 }}>
            {rows.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                No queues configured.
              </Typography>
            ) : null}

            {rows.map((r, idx) => (
              <Box
                key={r._rowId}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "80px 1fr 1fr 120px",
                  },
                  gap: 1,
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  #{idx + 1}
                </Typography>

                <TextField
                  label="Key"
                  size="small"
                  value={r.key}
                  onChange={(e) => updateField(r._rowId, "key", e.target.value)}
                  onBlur={() => updateField(r._rowId, "key", slugifyKey(r.key))}
                  placeholder="e.g., cutting"
                  disabled={!canEdit || saving}
                />

                <TextField
                  label="Label"
                  size="small"
                  value={r.label}
                  onChange={(e) =>
                    updateField(r._rowId, "label", e.target.value)
                  }
                  placeholder="e.g., Cutting"
                  disabled={!canEdit || saving}
                />

                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => moveRow(r._rowId, "up")}
                    disabled={idx === 0 || saving}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveRow(r._rowId, "down")}
                    disabled={idx === rows.length - 1 || saving}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => removeRow(r._rowId)}
                    disabled={saving}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
