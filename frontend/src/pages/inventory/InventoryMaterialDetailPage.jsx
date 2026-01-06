import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  apiAdjustStock,
  apiGetMaterial,
  apiGetMaterialLedger,
  apiPatchMaterial,
  apiReceiveStock,
} from "../../api/inventory.api";

function LowChip({ isLow }) {
  return (
    <Chip
      size="small"
      label={isLow ? "LOW" : "OK"}
      color={isLow ? "warning" : "default"}
      variant={isLow ? "filled" : "outlined"}
    />
  );
}

function HelpTip({ title, body }) {
  return (
    <Tooltip
      placement="right"
      title={
        <Box sx={{ p: 0.5, maxWidth: 360 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {body}
          </Typography>
        </Box>
      }
    >
      <IconButton size="small" aria-label={`Help: ${title}`}>
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export default function InventoryMaterialDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEdit = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user?.role]
  );

  const [material, setMaterial] = useState(null);
  const [ledger, setLedger] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    qty: "",
    unitCost: "",
    notes: "",
  });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ qtyDelta: "", notes: "" });

  const ledgerCols = useMemo(
    () => [
      {
        field: "at",
        headerName: "Time",
        width: 190,
        valueFormatter: (v) => (v ? new Date(v).toLocaleString() : ""),
      },
      { field: "type", headerName: "Type", width: 120 },
      {
        field: "qtyDelta",
        headerName: "Qty Δ",
        width: 110,
        valueFormatter: (v) =>
          v === null || v === undefined ? "—" : String(v),
      },
      {
        field: "balanceAfter",
        headerName: "Balance",
        width: 120,
        valueFormatter: (v) =>
          v === null || v === undefined ? "—" : String(v),
      },
      {
        field: "ref",
        headerName: "Ref",
        flex: 1,
        minWidth: 260,
        sortable: false,
        valueGetter: (_v, row) => {
          const r = row?.ref || {};
          if (r.orderNumber) return `Order ${r.orderNumber}`;
          if (r.entityType) return String(r.entityType);
          return "—";
        },
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1,
        minWidth: 260,
        sortable: false,
        valueFormatter: (v) => v || "—",
      },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const m = await apiGetMaterial(id);
      setMaterial({ ...m, id: m.id || m._id });

      const l = await apiGetMaterialLedger(id, { limit: 250 });
      setLedger((l || []).map((x) => ({ ...x, id: x.id || x._id })));
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

  async function saveEdit() {
    setErr("");
    try {
      const updated = await apiPatchMaterial(id, {
        sku: editForm.sku,
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        reorderPointQty: Number(editForm.reorderPointQty) || 0,
        reorderTargetQty: Number(editForm.reorderTargetQty) || 0,
        defaultUnitCost: Number(editForm.defaultUnitCost) || 0,
      });
      setMaterial({ ...updated, id: updated.id || updated._id });
      setEditOpen(false);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  async function doReceive() {
    setErr("");
    try {
      await apiReceiveStock(id, {
        qty: Number(receiveForm.qty),
        unitCost:
          receiveForm.unitCost === "" ? null : Number(receiveForm.unitCost),
        notes: receiveForm.notes || "",
      });
      setReceiveOpen(false);
      setReceiveForm({ qty: "", unitCost: "", notes: "" });
      await load();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  async function doAdjust() {
    setErr("");
    try {
      await apiAdjustStock(id, {
        qtyDelta: Number(adjustForm.qtyDelta),
        notes: adjustForm.notes || "",
      });
      setAdjustOpen(false);
      setAdjustForm({ qtyDelta: "", notes: "" });
      await load();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  if (!["admin", "supervisor", "production", "sales"].includes(user?.role)) {
    return <Alert severity="error">You do not have access to Inventory.</Alert>;
  }

  if (err) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="error">{err}</Alert>
        <Button
          variant="outlined"
          onClick={() => navigate("/inventory/materials")}
        >
          Back
        </Button>
      </Box>
    );
  }

  if (!material) return null;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {material.sku} — {material.name}
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
            <LowChip isLow={!!material?.lowStock?.isLow} />
            <Chip size="small" label={`unit: ${material.unit}`} />
            <Chip size="small" label={`on hand: ${material.onHandQty}`} />
            <Chip
              size="small"
              label={`reorder pt: ${material.reorderPointQty}`}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/inventory/materials")}
          >
            Back
          </Button>
          {canEdit ? (
            <Button
              variant="outlined"
              onClick={() => {
                setEditForm({
                  sku: material.sku,
                  name: material.name,
                  category: material.category,
                  unit: material.unit,
                  reorderPointQty: material.reorderPointQty ?? 0,
                  reorderTargetQty: material.reorderTargetQty ?? 0,
                  defaultUnitCost: material.defaultUnitCost ?? 0,
                });
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <Button variant="contained" onClick={() => setReceiveOpen(true)}>
                Receive
              </Button>
              <Button variant="outlined" onClick={() => setAdjustOpen(true)}>
                Adjust
              </Button>
            </>
          ) : null}
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            What these fields mean
          </Typography>
          <Divider />
          <Box sx={{ display: "grid", gap: 0.75 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              <b>Unit</b> defines the meaning of all quantities for this
              material (Receive / Adjust / Consume / BOM). Example: fasteners ={" "}
              <b>ea</b>, angle iron = <b>ft</b>, sheet metal = <b>sheet</b>.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              <b>Reorder point</b> is the alert threshold. When on-hand reaches
              this value or lower, the material is flagged <b>LOW</b>.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              <b>Reorder target</b> is a recommended “restock up to” level. It
              does not auto-purchase; it is guidance for restocking.
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Material Details
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Category: {material.category || "—"}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Default Unit Cost: {material.defaultUnitCost ?? 0}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Reorder Target: {material.reorderTargetQty ?? 0}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Stock Ledger
          </Typography>
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={ledger}
              columns={ledgerCols}
              loading={loading}
              rowSelection={false}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Material</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          <TextField
            label="SKU"
            value={editForm?.sku || ""}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, sku: e.target.value }))
            }
            size="small"
          />
          <TextField
            label="Name"
            value={editForm?.name || ""}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, name: e.target.value }))
            }
            size="small"
          />
          <TextField
            label="Category"
            value={editForm?.category || ""}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, category: e.target.value }))
            }
            size="small"
          />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Unit"
              value={editForm?.unit || ""}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, unit: e.target.value }))
              }
              size="small"
              sx={{ flex: 1 }}
              helperText="Common variants: ea, ft, in, lb, sheet, roll, box."
            />
            <HelpTip
              title="Unit and variants"
              body="Pick the unit the shop naturally uses. This keeps stock movements and BOM quantities consistent (ex: sheet metal as 'sheet', angle as 'ft', bolts as 'ea')."
            />
          </Box>

          <TextField
            label="Default Unit Cost"
            value={editForm?.defaultUnitCost ?? 0}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, defaultUnitCost: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
          />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Reorder Point Qty"
              value={editForm?.reorderPointQty ?? 0}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, reorderPointQty: e.target.value }))
              }
              size="small"
              type="number"
              inputProps={{ step: "0.001" }}
              sx={{ flex: 1 }}
              helperText="Alert threshold. LOW status triggers when on-hand is at or below this value."
            />
            <HelpTip
              title="Reorder point quantity"
              body="When stock reaches this quantity (or lower), the system flags it LOW and triggers internal alerts so purchasing/ops can restock."
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Reorder Target Qty"
              value={editForm?.reorderTargetQty ?? 0}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, reorderTargetQty: e.target.value }))
              }
              size="small"
              type="number"
              inputProps={{ step: "0.001" }}
              sx={{ flex: 1 }}
              helperText="Suggested refill level (restock up to this quantity)."
            />
            <HelpTip
              title="Reorder target quantity"
              body="A suggested ‘restock up to’ quantity. Example: reorder point 2, target 10 means alert at 2 and refill back up to 10."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive dialog */}
      <Dialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Receive Stock</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          <TextField
            label="Quantity"
            value={receiveForm.qty}
            onChange={(e) =>
              setReceiveForm((p) => ({ ...p, qty: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
            helperText={`The quantity is interpreted using the Unit (${material.unit}).`}
          />
          <TextField
            label="Unit cost (optional)"
            value={receiveForm.unitCost}
            onChange={(e) =>
              setReceiveForm((p) => ({ ...p, unitCost: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
          />
          <TextField
            label="Notes"
            value={receiveForm.notes}
            onChange={(e) =>
              setReceiveForm((p) => ({ ...p, notes: e.target.value }))
            }
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={doReceive}
            disabled={!receiveForm.qty}
          >
            Receive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adjust Stock</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          <Alert severity="info">
            Use positive values to add stock and negative values to subtract.
            Inventory is allowed to go negative (internal alerts will be
            generated).
          </Alert>
          <TextField
            label="Qty Δ"
            value={adjustForm.qtyDelta}
            onChange={(e) =>
              setAdjustForm((p) => ({ ...p, qtyDelta: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
            helperText={`Adjustment uses the Unit (${material.unit}).`}
          />
          <TextField
            label="Notes"
            value={adjustForm.notes}
            onChange={(e) =>
              setAdjustForm((p) => ({ ...p, notes: e.target.value }))
            }
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={doAdjust}
            disabled={!adjustForm.qtyDelta}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
