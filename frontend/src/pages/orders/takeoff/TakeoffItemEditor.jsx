import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { TAKEOFF_FIELD_LABELS } from "./takeoffFields";

export default function TakeoffItemEditor({ catalog, onAdd }) {
  const [typeCode, setTypeCode] = useState("");
  const [qty, setQty] = useState(1);
  const [ga, setGa] = useState("");
  const [material, setMaterial] = useState("");
  const [remarks, setRemarks] = useState("");
  const [measurements, setMeasurements] = useState({});
  const [err, setErr] = useState("");

  const selectedType = useMemo(
    () => (catalog?.types || []).find((t) => t.typeCode === typeCode),
    [catalog, typeCode]
  );

  const requiredFields = selectedType?.fields || [];

  function setField(key, val) {
    setMeasurements((prev) => ({ ...prev, [key]: val }));
  }

  function validate() {
    if (!typeCode) return "Select a piece/type.";
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0)
      return "Qty must be > 0.";

    for (const f of requiredFields) {
      const v = measurements?.[f];
      if (v === undefined || v === null || String(v).trim() === "") {
        return `Missing measurement: ${f}`;
      }
    }
    return "";
  }

  function handleAdd() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr("");

    onAdd({
      typeCode,
      qty: Number(qty) || 1,
      ga: ga || null,
      material: material || null,
      measurements,
      remarks: remarks || "",
    });

    // reset minimal
    setQty(1);
    setGa("");
    setMaterial("");
    setRemarks("");
    setMeasurements({});
    setTypeCode("");
  }

  return (
    <Card>
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Add Takeoff Line
        </Typography>

        {err ? <Alert severity="error">{err}</Alert> : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            select
            label="Piece / Type"
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
          >
            {(catalog?.types || []).map((t) => (
              <MenuItem key={t.typeCode} value={t.typeCode}>
                {t.typeCode} — {t.name}
              </MenuItem>
            ))}
          </TextField>

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
          <TextField
            label="Material (optional)"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="G90"
          />
          <TextField
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
          />
        </Box>

        <Divider />

        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Measurements
        </Typography>

        {!selectedType ? (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Select a type to see required measurements.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(6, 1fr)" },
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
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={handleAdd} disabled={!catalog}>
            Add Line
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
