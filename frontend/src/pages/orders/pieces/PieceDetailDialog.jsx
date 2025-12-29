import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  apiAssignPiece,
  apiPieceTimerPause,
  apiPieceTimerResume,
  apiPieceTimerStart,
  apiPieceTimerStop,
} from "../../../api/orders.api";
import PieceHistoryPanel from "./PieceHistoryPanel";

function formatDuration(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

function measurementsToText(m) {
  const entries = Object.entries(m || {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}:${v}`);
  return entries.join("  ");
}

export default function PieceDetailDialog({
  open,
  onClose,
  orderId,
  piece,
  boardColumns = [],
  users = [],
  onChanged,
  onOptimisticChange,
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // IMPORTANT: dialog renders from localPiece so timer/buttons update immediately
  const [localPiece, setLocalPiece] = useState(null);

  const [queueKey, setQueueKey] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [stopNotes, setStopNotes] = useState("");

  // Sync localPiece whenever a new piece is opened / changed
  useEffect(() => {
    setLocalPiece(piece || null);
  }, [piece?.id, open]); // piece.id is your stable UUID

  // Initialize local form fields when localPiece changes
  useEffect(() => {
    const p = localPiece;
    if (!p) return;

    const defaultQueue =
      p?.assignedQueueKey ||
      p?.pieceStatus ||
      boardColumns?.[0]?.key ||
      "queued";

    setQueueKey(defaultQueue);
    setManualUserId(p?.assignedTo ? String(p.assignedTo) : "");
    setStopNotes("");
    setErr("");
  }, [
    localPiece?.id,
    localPiece?.assignedQueueKey,
    localPiece?.pieceStatus,
    localPiece?.assignedTo,
    boardColumns,
  ]);

  const timer = localPiece?.timer || {
    state: "idle",
    accumulatedSec: 0,
    startedAt: null,
    pausedAt: null,
  };

  const isRunning = timer.state === "running";
  const isPaused = timer.state === "paused";

  // Live display counter (UI only; server authoritative)
  const [liveSec, setLiveSec] = useState(0);
  useEffect(() => {
    if (!open) return;

    const tick = () => {
      const acc = Number(timer.accumulatedSec) || 0;
      if (timer.state === "running" && timer.startedAt) {
        const started = new Date(timer.startedAt).getTime();
        const delta = Math.floor((Date.now() - started) / 1000);
        setLiveSec(acc + Math.max(0, delta));
      } else {
        setLiveSec(acc);
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [open, timer.state, timer.startedAt, timer.accumulatedSec]);

  const columnOptions = useMemo(
    () => (boardColumns || []).map((c) => ({ key: c.key, label: c.label })),
    [boardColumns]
  );

  function applyTimerResult(timerResult) {
    if (!timerResult) return;

    setLocalPiece((prev) => {
      if (!prev) return prev;

      const nextTimer = {
        ...(prev.timer || {}),
        state: timerResult.state ?? prev.timer?.state ?? "idle",
        accumulatedSec:
          typeof timerResult.accumulatedSec === "number"
            ? timerResult.accumulatedSec
            : Number(prev.timer?.accumulatedSec) || 0,
        startedAt: timerResult.startedAt ?? null,
        pausedAt: timerResult.pausedAt ?? null,
      };

      const next = { ...prev, timer: nextTimer };

      // If your backend returns workLog on stop, keep it in sync
      if (Array.isArray(timerResult.workLog)) {
        next.workLog = timerResult.workLog;
      }

      return next;
    });

    // Let parent/board update without requiring a full re-fetch
    onOptimisticChange?.({
      id: localPiece?.id,
      timer: timerResult,
    });
  }

  async function persistAssignment({ nextQueueKey, nextUserId }) {
    setErr("");
    setBusy(true);
    try {
      // piece.id is stable UUID
      await apiAssignPiece(orderId, localPiece.id, {
        queueKey: nextQueueKey,
        userId: nextUserId || null,
      });

      // update local piece immediately
      setLocalPiece((prev) => ({
        ...prev,
        pieceStatus: nextQueueKey,
        assignedQueueKey: nextQueueKey,
        assignedTo: nextUserId || null,
      }));

      onOptimisticChange?.({
        id: localPiece.id,
        pieceStatus: nextQueueKey,
        assignedQueueKey: nextQueueKey,
        assignedTo: nextUserId || null,
      });

      await onChanged?.();
    } catch (e) {
      setErr(`${e.code || "ERROR"}: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  // Timer runner that patches local state from the API response
  async function runTimer(fn, { closeAfter = false, clearNotes = false } = {}) {
    setErr("");
    setBusy(true);
    try {
      const result = await fn(); // <-- must use returned timer payload
      applyTimerResult(result);

      if (clearNotes) setStopNotes("");

      await onChanged?.();
      if (closeAfter) onClose?.();
    } catch (e) {
      setErr(`${e.code || "ERROR"}: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!localPiece) return null;

  const assignedUserLabel =
    users.find((u) => String(u.id) === String(localPiece.assignedTo))?.name ||
    (localPiece.assignedTo ? String(localPiece.assignedTo) : "—");

  const displayPieceName =
    localPiece.pieceRef ||
    `${localPiece.typeCode || "Piece"} #${localPiece.lineNo || "—"}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 900 }}>{displayPieceName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Qty {localPiece.qty} {localPiece.ga ? `| GA ${localPiece.ga}` : ""}{" "}
            {localPiece.material ? `| ${localPiece.material}` : ""}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={`Status: ${localPiece.pieceStatus || "queued"}`}
        />
      </DialogTitle>

      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {err ? <Alert severity="error">{err}</Alert> : null}

        <Alert severity="info">
          Measurements:{" "}
          <b>{measurementsToText(localPiece.measurements) || "—"}</b>
        </Alert>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          {/* Assignment */}
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Assignment
            </Typography>

            <TextField
              select
              label="Production Queue"
              value={queueKey}
              onChange={(e) => setQueueKey(e.target.value)}
              disabled={busy}
            >
              {columnOptions.map((c) => (
                <MenuItem key={c.key} value={c.key}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Assign to user"
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              disabled={busy}
            >
              <MenuItem value="">Select…</MenuItem>
              {(users || []).map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() =>
                  persistAssignment({
                    nextQueueKey: queueKey,
                    nextUserId: manualUserId,
                  })
                }
              >
                Save Assignment
              </Button>

              <Button
                variant="outlined"
                disabled={busy}
                onClick={() =>
                  persistAssignment({
                    nextQueueKey: queueKey,
                    nextUserId: null,
                  })
                }
              >
                Unassign
              </Button>
            </Box>

            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Current assigned: {assignedUserLabel}
            </Typography>
          </Box>

          {/* Timer */}
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Timer
            </Typography>

            <Alert severity="info">
              Time on this piece: <b>{formatDuration(liveSec)}</b>
            </Alert>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                disabled={busy || isRunning || !localPiece.assignedTo}
                onClick={() =>
                  runTimer(() => apiPieceTimerStart(orderId, localPiece.id))
                }
              >
                Start
              </Button>

              <Button
                variant="outlined"
                disabled={busy || !isRunning}
                onClick={() =>
                  runTimer(() => apiPieceTimerPause(orderId, localPiece.id))
                }
              >
                Pause
              </Button>

              <Button
                variant="outlined"
                disabled={busy || !isPaused}
                onClick={() =>
                  runTimer(() => apiPieceTimerResume(orderId, localPiece.id))
                }
              >
                Resume
              </Button>
            </Box>

            <Divider sx={{ my: 1 }} />

            <TextField
              label="Stop notes (optional)"
              value={stopNotes}
              onChange={(e) => setStopNotes(e.target.value)}
              disabled={busy}
            />

            <Button
              variant="outlined"
              color="warning"
              disabled={busy || (!isRunning && !isPaused)}
              onClick={() =>
                runTimer(
                  () => apiPieceTimerStop(orderId, localPiece.id, stopNotes),
                  { closeAfter: false, clearNotes: true }
                )
              }
            >
              Stop (commit work session)
            </Button>

            {!localPiece.assignedTo ? (
              <Alert severity="warning">
                Assign a user before starting the timer (required for
                accountability).
              </Alert>
            ) : null}
          </Box>
        </Box>

        <Divider />

        {/* History (UUID id for piece) */}
        <PieceHistoryPanel pieceId={localPiece?.id} dense />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
