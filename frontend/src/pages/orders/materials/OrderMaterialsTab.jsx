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
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiConsumeForOrder,
  apiGetInventorySettings,
  apiGetOrderBom,
  apiListMaterials,
  apiPatchOrderBom,
} from "../../../api/inventory.api";

function UnplannedChip({ value }) {
  return value ? (
    <Chip size="small" color="warning" label="Unplanned" />
  ) : (
    <Chip size="small" variant="outlined" label="Planned" />
  );
}

export default function OrderMaterialsTab({ order }) {
  const { user } = useAuth();

  const canEditBom = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user?.role]
  );
  const canConsume = useMemo(
    () => ["admin", "supervisor", "production"].includes(user?.role),
    [user?.role]
  );

  const [settings, setSettings] = useState(null);
  const [bom, setBom] = useState(null);
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    materialId: "",
    plannedQty: "",
    notes: "",
  });

  const [consumeOpen, setConsumeOpen] = useState(false);
  const [consumeForm, setConsumeForm] = useState({
    materialId: "",
    qty: "",
    notes: "",
  });

  const cols = useMemo(
    () => [
      {
        field: "material",
        headerName: "Material",
        flex: 1,
        minWidth: 260,
        valueGetter: (_v, row) =>
          row?.materialSnapshot?.name || row?.materialSnapshot?.sku || "—",
      },
      {
        field: "sku",
        headerName: "SKU",
        width: 160,
        valueGetter: (_v, row) => row?.materialSnapshot?.sku || "—",
      },
      {
        field: "unit",
        headerName: "Unit",
        width: 90,
        valueGetter: (_v, row) => row?.materialSnapshot?.unit || "—",
      },
      { field: "plannedQty", headerName: "Planned", width: 120 },
      { field: "consumedQty", headerName: "Consumed", width: 120 },
      {
        field: "remaining",
        headerName: "Remaining",
        width: 120,
        valueGetter: (_v, row) => {
          const p = Number(row?.plannedQty || 0);
          const c = Number(row?.consumedQty || 0);
          return p - c;
        },
      },
      {
        field: "unplanned",
        headerName: "Plan",
        width: 130,
        renderCell: (p) => <UnplannedChip value={!!p.row.unplanned} />,
      },
      { field: "notes", headerName: "Notes", flex: 1, minWidth: 220 },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [s, b, m] = await Promise.all([
        apiGetInventorySettings().catch(() => null),
        apiGetOrderBom(order.id).catch(() => null),
        apiListMaterials({ q: "", lowOnly: false, page: 0, limit: 500 }).catch(
          () => ({ items: [] })
        ),
      ]);

      setSettings(s);
      setBom(b);
      setMaterials(m?.items || []);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (order?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  async function addLine() {
    setErr("");
    try {
      const mat = materials.find(
        (x) => String(x.id) === String(addForm.materialId)
      );
      if (!mat)
        throw { code: "VALIDATION_ERROR", message: "Select a material." };

      const nextLines = [...(bom?.lines || [])];

      // if already exists, just update plannedQty
      const idx = nextLines.findIndex(
        (l) => String(l.materialId) === String(mat.id)
      );
      if (idx >= 0) {
        nextLines[idx] = {
          ...nextLines[idx],
          plannedQty: Number(addForm.plannedQty) || 0,
          notes: addForm.notes || nextLines[idx].notes || "",
          unplanned: false,
        };
      } else {
        nextLines.push({
          materialId: mat.id,
          materialSnapshot: {
            sku: mat.sku,
            name: mat.name,
            unit: mat.unit,
            spec: mat.spec || {},
          },
          plannedQty: Number(addForm.plannedQty) || 0,
          consumedQty: 0,
          notes: addForm.notes || "",
          unplanned: false,
          consumptionTxnIds: [],
        });
      }

      const updated = await apiPatchOrderBom(order.id, {
        lines: nextLines,
        status: bom?.status || "draft",
      });
      setBom(updated);
      setAddOpen(false);
      setAddForm({ materialId: "", plannedQty: "", notes: "" });
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  async function consume() {
    setErr("");
    try {
      const mat = materials.find(
        (x) => String(x.id) === String(consumeForm.materialId)
      );
      if (!mat)
        throw { code: "VALIDATION_ERROR", message: "Select a material." };

      await apiConsumeForOrder(order.id, {
        items: [
          {
            materialId: mat.id,
            qty: Number(consumeForm.qty),
            notes: consumeForm.notes || "",
          },
        ],
      });

      setConsumeOpen(false);
      setConsumeForm({ materialId: "", qty: "", notes: "" });

      await load();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  const bomRows = useMemo(() => {
    const lines = bom?.lines || [];
    return lines.map((l, i) => ({
      ...l,
      id: String(l.lineId || l.materialId || i),
    }));
  }, [bom]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Materials (BOM)
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Mode: {settings?.consumptionMode || "—"} (inventory does not
                block orders)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {canEditBom ? (
                <Button variant="outlined" onClick={() => setAddOpen(true)}>
                  Add / Plan
                </Button>
              ) : null}
              {canConsume ? (
                <Button
                  variant="contained"
                  onClick={() => setConsumeOpen(true)}
                >
                  Consume
                </Button>
              ) : null}
            </Box>
          </Box>

          <Divider />

          <Box sx={{ height: 520 }}>
            <DataGrid
              rows={bomRows}
              columns={cols}
              loading={loading}
              rowSelection={false}
            />
          </Box>

          {!bom ? (
            <Alert severity="info">
              No BOM created yet. In Assisted mode, consuming materials will
              auto-create unplanned lines.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {/* Add/Plan dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add / Plan Material</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          {!canEditBom ? (
            <Alert severity="error">Supervisor/Admin required.</Alert>
          ) : null}
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Material
            </Typography>
            <Select
              fullWidth
              size="small"
              value={addForm.materialId}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, materialId: e.target.value }))
              }
            >
              {materials.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.sku} — {m.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <TextField
            label="Planned Qty"
            value={addForm.plannedQty}
            onChange={(e) =>
              setAddForm((p) => ({ ...p, plannedQty: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
          />

          <TextField
            label="Notes"
            value={addForm.notes}
            onChange={(e) =>
              setAddForm((p) => ({ ...p, notes: e.target.value }))
            }
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={addLine}
            disabled={!canEditBom || !addForm.materialId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consume dialog */}
      <Dialog
        open={consumeOpen}
        onClose={() => setConsumeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Consume Material</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          {!canConsume ? (
            <Alert severity="error">
              Production/Supervisor/Admin required.
            </Alert>
          ) : null}
          <Alert severity="info">
            Consumption always records to the ledger. If stock goes
            low/negative, internal alerts are generated.
          </Alert>

          <Box>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Material
            </Typography>
            <Select
              fullWidth
              size="small"
              value={consumeForm.materialId}
              onChange={(e) =>
                setConsumeForm((p) => ({ ...p, materialId: e.target.value }))
              }
            >
              {materials.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.sku} — {m.name} (on hand: {m.onHandQty})
                </MenuItem>
              ))}
            </Select>
          </Box>

          <TextField
            label="Quantity"
            value={consumeForm.qty}
            onChange={(e) =>
              setConsumeForm((p) => ({ ...p, qty: e.target.value }))
            }
            size="small"
            type="number"
            inputProps={{ step: "0.001" }}
          />

          <TextField
            label="Notes"
            value={consumeForm.notes}
            onChange={(e) =>
              setConsumeForm((p) => ({ ...p, notes: e.target.value }))
            }
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsumeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={consume}
            disabled={
              !canConsume || !consumeForm.materialId || !consumeForm.qty
            }
          >
            Consume
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
