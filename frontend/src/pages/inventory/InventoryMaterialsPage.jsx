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
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { apiCreateMaterial, apiListMaterials } from "../../api/inventory.api";

function LowChip({ material }) {
  const isLow = material?.lowStock?.isLow;
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

export default function InventoryMaterialsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canCreate = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user?.role]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    sku: "",
    name: "",
    category: "",
    unit: "ea",
    reorderPointQty: 0,
    reorderTargetQty: 0,
  });

  const columns = useMemo(
    () => [
      { field: "sku", headerName: "SKU", width: 170 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 260 },
      { field: "category", headerName: "Category", width: 160 },
      { field: "unit", headerName: "Unit", width: 90 },
      {
        field: "onHandQty",
        headerName: "On hand",
        width: 120,
        valueFormatter: (v) =>
          v === null || v === undefined ? "—" : String(v),
      },
      {
        field: "reorderPointQty",
        headerName: "Reorder Pt",
        width: 130,
        valueFormatter: (v) =>
          v === null || v === undefined ? "—" : String(v),
      },
      {
        field: "low",
        headerName: "Status",
        width: 110,
        sortable: false,
        renderCell: (params) => <LowChip material={params.row} />,
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 190,
        valueFormatter: (v) => (v ? new Date(v).toLocaleString() : ""),
      },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiListMaterials({
        q,
        lowOnly,
        page,
        limit: pageSize,
      });
      setRows((res?.items || []).map((m) => ({ ...m, id: m.id || m._id })));
      setTotal(res?.total || 0);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, lowOnly, page, pageSize]);

  async function createMaterial() {
    setErr("");
    try {
      const created = await apiCreateMaterial({
        ...createForm,
        reorderPointQty: Number(createForm.reorderPointQty) || 0,
        reorderTargetQty: Number(createForm.reorderTargetQty) || 0,
      });
      setCreateOpen(false);
      setCreateForm({
        sku: "",
        name: "",
        category: "",
        unit: "ea",
        reorderPointQty: 0,
        reorderTargetQty: 0,
      });
      navigate(`/inventory/materials/${created.id || created._id}`);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    }
  }

  if (!["admin", "supervisor", "production", "sales"].includes(user?.role)) {
    return <Alert severity="error">You do not have access to Inventory.</Alert>;
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Inventory — Materials
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Catalog + stock on-hand + low-stock status.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New Material
            </Button>
          ) : null}
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label="Search"
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              size="small"
              sx={{ minWidth: 260 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={lowOnly}
                  onChange={(e) => {
                    setPage(0);
                    setLowOnly(e.target.checked);
                  }}
                />
              }
              label="Low only"
            />
          </Box>

          <Box sx={{ height: 640 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              rowSelection={false}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => {
                setPage(m.page);
                setPageSize(m.pageSize);
              }}
              onRowClick={(params) =>
                navigate(`/inventory/materials/${params.row.id}`)
              }
            />
          </Box>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Material</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
          <Alert severity="info">
            Tip: Choose a <b>Unit</b> that matches how the shop tracks/uses this
            material (each, feet, sheet, pounds). This improves consistency
            across BOM and consumption.
          </Alert>

          <TextField
            label="SKU"
            value={createForm.sku}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, sku: e.target.value }))
            }
            size="small"
          />
          <TextField
            label="Name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, name: e.target.value }))
            }
            size="small"
          />
          <TextField
            label="Category"
            value={createForm.category}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, category: e.target.value }))
            }
            size="small"
          />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Unit"
              value={createForm.unit}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, unit: e.target.value }))
              }
              size="small"
              placeholder="ea / sheet / ft / lb"
              sx={{ flex: 1 }}
              helperText="Common variants: ea (each), ft (feet), in (inches), lb (pounds), sheet, roll, box."
            />
            <HelpTip
              title="Unit and variants"
              body="The unit defines the meaning of quantities across Receive / Adjust / Consume and the BOM. Use whichever unit the shop naturally thinks in (e.g., sheet metal as 'sheet', angle as 'ft', fasteners as 'ea')."
            />
          </Box>

          <Divider />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Reorder Point Qty"
              value={createForm.reorderPointQty}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  reorderPointQty: e.target.value,
                }))
              }
              size="small"
              type="number"
              inputProps={{ step: "0.001" }}
              sx={{ flex: 1 }}
              helperText="When on-hand drops to this value or lower, the system flags the material as LOW and triggers internal alerts."
            />
            <HelpTip
              title="Reorder point quantity"
              body="Threshold for alerts. Example: reorder point 2 sheets means when stock reaches 2 or less, it is flagged LOW so purchasing/ops can restock."
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Reorder Target Qty (optional)"
              value={createForm.reorderTargetQty}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  reorderTargetQty: e.target.value,
                }))
              }
              size="small"
              type="number"
              inputProps={{ step: "0.001" }}
              sx={{ flex: 1 }}
              helperText="Suggested 'restock up to' quantity. Used for guidance; it does not automatically purchase stock."
            />
            <HelpTip
              title="Reorder target quantity"
              body="Recommended refill level. Example: reorder point 2, reorder target 10 means: alert at 2, and the recommended restock is to bring inventory back up to 10."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createMaterial}
            disabled={!createForm.sku || !createForm.name || !createForm.unit}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
