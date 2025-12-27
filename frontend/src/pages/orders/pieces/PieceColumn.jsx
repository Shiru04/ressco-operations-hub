import React from "react";
import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import PieceCard from "./PieceCard";

export default function PieceColumn({ column, pieces, onOpen }) {
  const droppableId = `pcol:${column.key}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const ids = (pieces || []).map((p) => p.id);

  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 520,
        border: isOver
          ? "2px solid rgba(255,214,10,0.6)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <CardContent sx={{ display: "grid", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 900 }}>{column.label}</Typography>
          <Chip size="small" label={pieces?.length || 0} />
        </Box>

        <Box
          ref={setNodeRef}
          sx={{
            display: "grid",
            gap: 1,
            alignContent: "start",
            minHeight: 440,
            borderRadius: 2,
            p: 0.5,
            bgcolor: isOver ? "rgba(255,214,10,0.06)" : "transparent",
          }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {(pieces || []).map((p) => (
              <PieceCard key={p.id} piece={p} onOpen={onOpen} />
            ))}
          </SortableContext>
        </Box>
      </CardContent>
    </Card>
  );
}
