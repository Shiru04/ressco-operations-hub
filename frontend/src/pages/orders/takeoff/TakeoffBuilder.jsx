import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Chip } from "@mui/material";
import { apiGetTakeoffCatalog } from "../../../api/takeoff.api";
import { apiPatchOrderTakeoff } from "../../../api/orders.api";
import TakeoffHeaderForm from "./TakeoffHeaderForm";
import TakeoffItemsTable from "./TakeoffItemsTable";
import TakeoffTypePicker from "./TakeoffTypePicker";
import TakeoffPieceDrawer from "./TakeoffPieceDrawer";
import { apiGetTakeoffPdfBlob } from "../../../api/orders.api";

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function TakeoffBuilder({ orderId, initialTakeoff, onSaved }) {
  const [catalog, setCatalog] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [err, setErr] = useState("");

  const [header, setHeader] = useState(initialTakeoff?.header || {});
  const [items, setItems] = useState(() => {
    const src = initialTakeoff?.items || [];
    return src.map((x, i) => ({
      id: x._id || x.id || makeId(),
      lineNo: x.lineNo ?? i + 1,
      typeCode: x.typeCode,
      qty: x.qty ?? 1,
      ga: x.ga ?? "",
      material: x.material ?? "",
      measurements: x.measurements || {},
      remarks: x.remarks || "",
    }));
  });

  const [selectedType, setSelectedType] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setHeader(initialTakeoff?.header || {});
    const src = initialTakeoff?.items || [];
    setItems(
      src.map((x, i) => ({
        id: x._id || x.id || makeId(),
        lineNo: x.lineNo ?? i + 1,
        typeCode: x.typeCode,
        qty: x.qty ?? 1,
        ga: x.ga ?? "",
        material: x.material ?? "",
        measurements: x.measurements || {},
        remarks: x.remarks || "",
      }))
    );
  }, [initialTakeoff]);

  useEffect(() => {
    setLoadingCatalog(true);
    apiGetTakeoffCatalog()
      .then((c) => setCatalog(c))
      .catch((e) => setErr(`${e.code}: ${e.message}`))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const normalizedItemsForSave = useMemo(() => {
    return (items || []).map((it, idx) => ({
      lineNo: idx + 1,
      typeCode: it.typeCode,
      qty: Number(it.qty) || 1,
      ga: it.ga || null,
      material: it.material || null,
      measurements: it.measurements || {},
      remarks: it.remarks || "",
    }));
  }, [items]);

  async function saveTakeoff(nextHeader, nextItems) {
    setErr("");
    setSaving(true);
    setSaveState("saving");
    try {
      const result = await apiPatchOrderTakeoff(orderId, {
        header: nextHeader,
        items: nextItems,
      });
      setSaveState("saved");
      onSaved?.(result.takeoff);
      return result.takeoff;
    } catch (e) {
      setSaveState("error");
      setErr(`${e.code}: ${e.message}`);
      throw e;
    } finally {
      setSaving(false);
      // return to idle after a moment
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
    }
  }

  // Manual save (for header edits)
  async function saveHeaderOnly() {
    await saveTakeoff(header, normalizedItemsForSave);
  }

  async function addLine(line) {
    // Optimistic local update
    const nextItemsLocal = [...items, { ...line, id: makeId() }].map(
      (x, i) => ({ ...x, lineNo: i + 1 })
    );
    setItems(nextItemsLocal);

    // Persist immediately (recommended by you)
    await saveTakeoff(
      header,
      nextItemsLocal.map((it) => ({
        lineNo: it.lineNo,
        typeCode: it.typeCode,
        qty: Number(it.qty) || 1,
        ga: it.ga || null,
        material: it.material || null,
        measurements: it.measurements || {},
        remarks: it.remarks || "",
      }))
    );
  }

  async function removeLine(id) {
    const nextItemsLocal = items
      .filter((x) => x.id !== id)
      .map((x, i) => ({ ...x, lineNo: i + 1 }));
    setItems(nextItemsLocal);

    await saveTakeoff(
      header,
      nextItemsLocal.map((it) => ({
        lineNo: it.lineNo,
        typeCode: it.typeCode,
        qty: Number(it.qty) || 1,
        ga: it.ga || null,
        material: it.material || null,
        measurements: it.measurements || {},
        remarks: it.remarks || "",
      }))
    );
  }

  function openType(t) {
    setSelectedType(t);
    setDrawerOpen(true);
  }
  const hasLines = normalizedItemsForSave.length > 0;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {err ? <Alert severity="error">{err}</Alert> : null}
      {!hasLines ? (
        <Alert severity="warning">
          Add at least one takeoff line before generating the PDF.
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {saveState === "saving" ? <Chip size="small" label="Saving…" /> : null}
        {saveState === "saved" ? <Chip size="small" label="Saved" /> : null}
        {saveState === "error" ? (
          <Chip size="small" label="Save failed" />
        ) : null}

        <Button variant="contained" onClick={saveHeaderOnly} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : null}
          Save Header
        </Button>

        <Button
          variant="outlined"
          disabled={saving || !hasLines}
          onClick={async () => {
            try {
              const blob = await apiGetTakeoffPdfBlob(orderId);
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank", "noopener,noreferrer");
              setTimeout(() => URL.revokeObjectURL(url), 60_000);
            } catch (e) {
              setErr(`${e.code}: ${e.message}`);
            }
          }}
        >
          Generate Takeoff PDF
        </Button>
      </Box>

      <TakeoffHeaderForm value={header} onChange={setHeader} />

      {loadingCatalog ? (
        <Alert severity="info">Loading takeoff catalog…</Alert>
      ) : (
        <TakeoffTypePicker catalog={catalog} onSelect={openType} />
      )}

      <TakeoffItemsTable items={items} onRemove={removeLine} />

      <TakeoffPieceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        type={selectedType}
        onAdd={addLine}
        saving={saving}
      />
    </Box>
  );
}
