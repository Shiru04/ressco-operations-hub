import React, { useRef } from "react";
import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function measurementsToText(m) {
  const entries = Object.entries(m || {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, 8)
    .map(([k, v]) => `${k}:${v}`);
  return entries.join("  ");
}

export default function PieceCard({ piece, onOpen }) {
  const justDraggedRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: piece.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} variant="outlined">
      <CardContent
        onClick={() => {
          if (justDraggedRef.current) return;
          onOpen?.(piece);
        }}
        sx={{ display: "grid", gap: 0.75, p: 1.25, cursor: "pointer" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 900 }}>
            #{piece.lineNo} {piece.typeCode}
          </Typography>
          <Chip size="small" label={`qty ${piece.qty}`} />
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {measurementsToText(piece.measurements) || "—"}
        </Typography>

        {piece.ga ? (
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            GA: {piece.ga}
          </Typography>
        ) : null}

        {piece.remarks ? (
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {piece.remarks}
          </Typography>
        ) : null}

        {/* Drag handle (DO NOT override dnd-kit listener) */}
        <Box
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onPointerDownCapture={() => {
            justDraggedRef.current = true;
            setTimeout(() => (justDraggedRef.current = false), 250);
          }}
          onClick={(e) => e.stopPropagation()}
          sx={{
            mt: 0.5,
            p: 0.6,
            borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.04)",
            textAlign: "center",
            fontSize: 12,
            opacity: 0.85,
            userSelect: "none",
            cursor: "grab",
          }}
        >
          Drag
        </Box>
      </CardContent>
    </Card>
  );
}
