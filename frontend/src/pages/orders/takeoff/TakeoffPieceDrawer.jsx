import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { TAKEOFF_FIELD_LABELS } from "./takeoffFields";
import { getTakeoffIconUrl } from "./iconResolver";

export default function TakeoffPieceDrawer({
  open,
  onClose,
  type,
  onAdd,
  saving,
}) {
  const requiredFields = type?.fields || [];

  const [qty, setQty] = useState(1);
  const [ga, setGa] = useState("");
  const [material, setMaterial] = useState("");
  const [remarks, setRemarks] = useState("");
  const [measurements, setMeasurements] = useState({});
  const [err, setErr] = useState("");

  // reset when type changes
  React.useEffect(() => {
    setQty(1);
    setGa("");
    setMaterial("");
    setRemarks("");
    setMeasurements({});
    setErr("");
  }, [type?.typeCode]);

  function setField(k, v) {
    setMeasurements((prev) => ({ ...prev, [k]: v }));
  }

  const canAdd = useMemo(() => {
    if (!type) return false;
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0) return false;
    for (const f of requiredFields) {
      const v = measurements?.[f];
      if (v === undefined || v === null || String(v).trim() === "")
        return false;
    }
    return true;
  }, [type, qty, requiredFields, measurements]);

  function validate() {
    if (!type) return "No piece selected.";
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0)
      return "Qty must be > 0.";
    for (const f of requiredFields) {
      const v = measurements?.[f];
      if (v === undefined || v === null || String(v).trim() === "")
        return `Missing measurement: ${f}`;
    }
    return "";
  }

  async function handleAdd() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr("");

    await onAdd({
      typeCode: type.typeCode,
      qty: Number(qty) || 1,
      ga: ga || null,
      material: material || null,
      measurements,
      remarks: remarks || "",
    });

    // keep drawer open for rapid entry; you can close manually
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{ width: { xs: "100vw", sm: 420 }, p: 2, display: "grid", gap: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {type ? `${type.typeCode} — ${type.name}` : "Select a piece"}
        </Typography>

        {type ? (
          <Box
            sx={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.04)",
            }}
          >
            <img
              src={getTakeoffIconUrl(type.typeCode)}
              alt={type.typeCode}
              style={{ maxWidth: "92%", maxHeight: "92%" }}
            />
          </Box>
        ) : null}

        {err ? <Alert severity="error">{err}</Alert> : null}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Qty"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <TextField
            label="GA"
            value={ga}
            onChange={(e) => setGa(e.target.value)}
            placeholder="24"
          />
        </Box>

        <TextField
          label="Material (optional)"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="G90 / SS / AL"
        />

        <Divider />

        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Measurements (required)
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
          }}
        >
          {requiredFields.map((f) => (
            <TextField
              key={f}
              label={TAKEOFF_FIELD_LABELS[f] || f}
              value={measurements?.[f] ?? ""}
              onChange={(e) => setField(f, e.target.value)}
              inputProps={{ inputMode: "numeric" }}
            />
          ))}
        </Box>

        <TextField
          label="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          multiline
          minRows={2}
        />

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="contained"
            disabled={!canAdd || saving}
            onClick={handleAdd}
          >
            Add to Order (Auto-save)
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
