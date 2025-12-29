import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Typography } from "@mui/material";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";

import { apiGetProductionBoard } from "../../../api/production.api";
import { apiPatchTakeoffItemStatus } from "../../../api/orders.api";
import PieceColumn from "./PieceColumn";
import PieceDetailDialog from "./PieceDetailDialog";
import { apiListUsers } from "../../../api/users.api";

export default function PiecesBoard({ order, reloadOrder }) {
  const [err, setErr] = useState("");
  const [board, setBoard] = useState(null);

  const [users, setUsers] = useState([]);

  useEffect(() => {
    apiListUsers({ role: "production", active: true })
      .then((r) => setUsers(r.items || []))
      .catch(() => {});
  }, []);

  const [pieces, setPieces] = useState([]);
  const [openPiece, setOpenPiece] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    apiGetProductionBoard()
      .then(setBoard)
      .catch((e) => setErr(`${e.code}: ${e.message}`));
  }, []);

  const columns = useMemo(() => board?.columns || [], [board]);

  useEffect(() => {
    const src = order?.takeoff?.items || [];

    const mapped = src.map((x, idx) => {
      // ✅ canonical stable identity
      const stableId = String(x.pieceUid || x._id || x.id);

      return {
        id: stableId, // used by drag/drop + API calls
        mongoId: String(x._id || x.id || ""), // keep for debugging/back-compat
        pieceUid: x.pieceUid ? String(x.pieceUid) : null,
        pieceRef: x.pieceRef || null,

        lineNo: x.lineNo ?? idx + 1,
        typeCode: x.typeCode,
        qty: x.qty ?? 1,
        ga: x.ga || "",
        material: x.material || "",
        remarks: x.remarks || "",
        measurements: x.measurements || {},

        // IMPORTANT: do not change logic; pieceStatus is the queue key
        pieceStatus: x.pieceStatus || x.assignedQueueKey || "queued",
        assignedQueueKey: x.assignedQueueKey || x.pieceStatus || "",
        assignedTo: x.assignedTo || null,
        assignedAt: x.assignedAt || null,

        timer: x.timer || {
          state: "idle",
          accumulatedSec: 0,
          startedAt: null,
          pausedAt: null,
        },
        workLog: x.workLog || [],
      };
    });

    setPieces(mapped);
  }, [order]);

  // Keep modal piece fresh after reloadOrder()
  useEffect(() => {
    if (!openPiece?.id) return;
    const updated = pieces.find((p) => p.id === openPiece.id);
    if (updated) setOpenPiece(updated);
  }, [pieces, openPiece?.id]);

  const grouped = useMemo(() => {
    const map = {};
    for (const c of columns) map[c.key] = [];

    for (const p of pieces) {
      const fallback = columns[0]?.key || "queued";
      const k = map[p.pieceStatus] ? p.pieceStatus : fallback;
      map[k] = map[k] || [];
      map[k].push(p);
    }

    for (const c of columns) {
      map[c.key] = (map[c.key] || []).sort(
        (a, b) => (a.lineNo || 0) - (b.lineNo || 0)
      );
    }

    return map;
  }, [pieces, columns]);

  function findContainerByPieceId(pieceId) {
    for (const c of columns) {
      const list = grouped?.[c.key] || [];
      if (list.some((p) => p.id === pieceId)) return c.key;
    }
    return null;
  }

  async function onDragEnd(event) {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const pieceId = String(active.id); // ✅ this is now pieceUid

    const from = findContainerByPieceId(pieceId);
    const to = String(over.id).startsWith("pcol:")
      ? String(over.id).replace("pcol:", "")
      : findContainerByPieceId(String(over.id));

    if (!from || !to || from === to) return;

    // optimistic UI
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, pieceStatus: to } : p))
    );

    try {
      // ✅ pass stable id
      await apiPatchTakeoffItemStatus(order.id, pieceId, to);
      await reloadOrder?.();
    } catch (e) {
      // rollback
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, pieceStatus: from } : p))
      );
      setErr(`${e.code}: ${e.message}`);
    }
  }

  if (err) return <Alert severity="error">{err}</Alert>;
  if (!board) return <Alert severity="info">Loading pieces board…</Alert>;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Pieces Board
        </Typography>
        <Chip size="small" label={`Pieces: ${pieces.length}`} />
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: `repeat(${columns.length}, 1fr)`,
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          {columns.map((c) => {
            const list = grouped[c.key] || [];
            return (
              <PieceColumn
                key={c.key}
                column={c}
                pieces={list}
                onOpen={(p) => setOpenPiece(p)}
              />
            );
          })}
        </Box>
      </DndContext>

      <PieceDetailDialog
        open={Boolean(openPiece)}
        onClose={() => setOpenPiece(null)}
        orderId={order.id}
        piece={openPiece}
        boardColumns={columns}
        users={users}
        onOptimisticChange={(patch) => {
          setPieces((prev) =>
            prev.map((p) => (p.id === patch.id ? { ...p, ...patch } : p))
          );
        }}
        onChanged={reloadOrder}
      />

      <Alert severity="info">
        Drag a piece card to update its production status. Click a piece to
        assign and track time.
      </Alert>
    </Box>
  );
}
