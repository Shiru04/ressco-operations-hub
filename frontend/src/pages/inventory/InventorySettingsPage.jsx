import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Select,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  apiGetInventorySettings,
  apiPatchInventorySettings,
} from "../../api/inventory.api";

const PRESETS = ["LIGHTWEIGHT", "ASSISTED", "STRICT"];
const MODES = ["NO_BOM", "BOM_ASSISTED", "BOM_STRICT"];

function presetExplain(p) {
  if (p === "LIGHTWEIGHT") {
    return "Best for teams that want simple stock tracking. Consumption can be ledger-only; BOM planning is optional.";
  }
  if (p === "ASSISTED") {
    return "Recommended default. Allows shop-floor flexibility. Consuming materials can auto-create unplanned BOM lines so you still get visibility.";
  }
  if (p === "STRICT") {
    return "Best for process discipline. Consumption expects planned BOM lines first (unless you change the mode).";
  }
  return "";
}

function modeExplain(m) {
  if (m === "NO_BOM") {
    return "Ledger-only: materials can be consumed against an order without requiring a BOM. BOM becomes optional/planning-only.";
  }
  if (m === "BOM_ASSISTED") {
    return "Flexible: you can consume anything. If a BOM line is missing, it will be auto-created and flagged as unplanned.";
  }
  if (m === "BOM_STRICT") {
    return "Controlled: consumption requires the material to exist on the order BOM first. Use when you want strong planning enforcement.";
  }
  return "";
}

export default function InventorySettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [showRaw, setShowRaw] = useState(false);

  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  async function load() {
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      const s = await apiGetInventorySettings();
      setSettings(s);
      setForm({
        preset: s.preset || "ASSISTED",
        consumptionMode: s.consumptionMode || "BOM_ASSISTED",
        qtyPrecision: { maxDecimals: s.qtyPrecision?.maxDecimals ?? 3 },
        lowStockRules: {
          enableReorderPoint: s.lowStockRules?.enableReorderPoint ?? true,
          alertOnNegative: s.lowStockRules?.alertOnNegative ?? true,
          alertCooldownMinutes: s.lowStockRules?.alertCooldownMinutes ?? 1440,
        },
      });
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      const updated = await apiPatchInventorySettings(form);
      setSettings(updated);
      setOkMsg("Saved.");
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return <Alert severity="error">Admin access required.</Alert>;
  }

  if (!form) return null;

  const effective = settings || form;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Inventory Settings
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          Configure how inventory behaves. These settings only affect internal
          operations. Inventory does not block orders.
        </Typography>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}
      {okMsg ? <Alert severity="success">{okMsg}</Alert> : null}

      <Alert severity="info">
        Inventory always allows work to continue. If stock goes low or negative,
        the system generates internal alerts so supervisors/admin can react.
      </Alert>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Workflow preset
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Presets are “starting points” for common shop workflows. You can
            then fine-tune the mode below.
          </Typography>
          <Divider />

          <Box sx={{ display: "grid", gap: 1, maxWidth: 720 }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Preset
              </Typography>
              <Select
                fullWidth
                size="small"
                value={form.preset}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preset: e.target.value }))
                }
              >
                {PRESETS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
                {presetExplain(form.preset)}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Consumption mode
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Controls whether consumption expects an order BOM first, and how
                the system behaves if the BOM is missing.
              </Typography>

              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Consumption Mode
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={form.consumptionMode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, consumptionMode: e.target.value }))
                  }
                >
                  {MODES.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
                  {modeExplain(form.consumptionMode)}
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Quantity and alert behavior
              </Typography>

              <TextField
                label="Max decimals"
                value={form.qtyPrecision.maxDecimals}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    qtyPrecision: { maxDecimals: Number(e.target.value) },
                  }))
                }
                size="small"
                type="number"
                inputProps={{ min: 0, max: 8, step: 1 }}
                helperText="Controls rounding for stock movements and consumption. Example: 3 decimals allows 0.125, 1.250, etc."
              />

              <TextField
                label="Alert cooldown (minutes)"
                value={form.lowStockRules.alertCooldownMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    lowStockRules: {
                      ...p.lowStockRules,
                      alertCooldownMinutes: Number(e.target.value),
                    },
                  }))
                }
                size="small"
                type="number"
                inputProps={{ min: 0, step: 60 }}
                helperText="Prevents alert spam for the same material. Example: 1440 minutes = once per day."
              />

              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button variant="outlined" onClick={load} disabled={loading}>
                  Reload
                </Button>
                <Button variant="contained" onClick={save} disabled={loading}>
                  Save
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Current settings summary
          </Typography>
          <Divider />

          <Box sx={{ display: "grid", gap: 0.75 }}>
            <Typography variant="body2">
              <b>Preset:</b> {effective?.preset || "—"}
            </Typography>
            <Typography variant="body2">
              <b>Consumption mode:</b> {effective?.consumptionMode || "—"}
            </Typography>
            <Typography variant="body2">
              <b>Decimals:</b> {effective?.qtyPrecision?.maxDecimals ?? "—"}
            </Typography>
            <Typography variant="body2">
              <b>Alert cooldown:</b>{" "}
              {effective?.lowStockRules?.alertCooldownMinutes ?? "—"} minutes
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {modeExplain(effective?.consumptionMode)}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <FormControlLabel
            control={
              <Switch
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
              />
            }
            label="Show raw JSON"
          />

          {showRaw ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(settings, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
