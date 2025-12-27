// frontend/src/pages/orders/pieces/PieceDetailDialog.jsx
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

  const [queueKey, setQueueKey] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [stopNotes, setStopNotes] = useState("");

  // Initialize local form fields when piece changes
  useEffect(() => {
    const defaultQueue =
      piece?.assignedQueueKey ||
      piece?.pieceStatus ||
      boardColumns?.[0]?.key ||
      "queued";
    setQueueKey(defaultQueue);
    setManualUserId(piece?.assignedTo ? String(piece.assignedTo) : "");
    setStopNotes("");
    setErr("");
  }, [
    piece?.id,
    piece?.assignedQueueKey,
    piece?.pieceStatus,
    piece?.assignedTo,
    boardColumns,
  ]);

  const timer = piece?.timer || {
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

  async function persistAssignment({ nextQueueKey, nextUserId }) {
    setErr("");
    setBusy(true);
    try {
      await apiAssignPiece(orderId, piece.id, {
        queueKey: nextQueueKey,
        userId: nextUserId || null, // manual only
      });

      onOptimisticChange?.({
        id: piece.id,
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

  async function runTimer(fn, { closeAfter = false } = {}) {
    setErr("");
    setBusy(true);
    try {
      await fn();
      await onChanged?.();
      if (closeAfter) onClose?.();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!piece) return null;

  const assignedUserLabel =
    users.find((u) => String(u.id) === String(piece.assignedTo))?.name ||
    (piece.assignedTo ? String(piece.assignedTo) : "—");

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
          <Typography sx={{ fontWeight: 900 }}>
            Piece #{piece.lineNo} — {piece.typeCode}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Qty {piece.qty} {piece.ga ? `| GA ${piece.ga}` : ""}
          </Typography>
        </Box>
        <Chip size="small" label={`Status: ${piece.pieceStatus || "queued"}`} />
      </DialogTitle>

      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {err ? <Alert severity="error">{err}</Alert> : null}

        <Alert severity="info">
          Measurements: <b>{measurementsToText(piece.measurements) || "—"}</b>
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

            <Alert severity="warning">
              Changing the Production Queue will move the piece to that column
              (status) after saving.
            </Alert>
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
                disabled={busy || isRunning || !piece.assignedTo}
                onClick={() =>
                  runTimer(() => apiPieceTimerStart(orderId, piece.id))
                }
              >
                Start
              </Button>

              <Button
                variant="outlined"
                disabled={busy || !isRunning}
                onClick={() =>
                  runTimer(() => apiPieceTimerPause(orderId, piece.id))
                }
              >
                Pause
              </Button>

              <Button
                variant="outlined"
                disabled={busy || !isPaused}
                onClick={() =>
                  runTimer(() => apiPieceTimerResume(orderId, piece.id))
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
                  () => apiPieceTimerStop(orderId, piece.id, stopNotes),
                  { closeAfter: false }
                )
              }
            >
              Stop (commit work session)
            </Button>

            {!piece.assignedTo ? (
              <Alert severity="warning">
                Assign a user before starting the timer (required for
                accountability).
              </Alert>
            ) : null}
          </Box>
        </Box>

        {/* Work history */}
        <Divider />

        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Work History
          </Typography>

          {(piece.workLog || []).length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              No work sessions yet.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {piece.workLog.map((w, idx) => {
                const userName =
                  users.find((u) => String(u.id) === String(w.userId))?.name ||
                  String(w.userId);
                return (
                  <Box
                    key={`${String(w.userId)}-${idx}`}
                    sx={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 2,
                      p: 1,
                      display: "grid",
                      gap: 0.25,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      User: {userName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {new Date(w.startedAt).toLocaleString()} →{" "}
                      {new Date(w.endedAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Duration: {formatDuration(w.durationSec)}
                    </Typography>
                    {w.notes ? (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        Notes: {w.notes}
                      </Typography>
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
