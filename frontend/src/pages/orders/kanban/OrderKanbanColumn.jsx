import React from "react";
import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import OrderKanbanCard from "./OrderKanbanCard";

export default function OrderKanbanColumn({ column, orders }) {
  const droppableId = `col:${column.key}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <Card
      ref={setNodeRef}
      sx={{
        border: isOver
          ? "2px solid rgba(255,214,10,0.6)"
          : "1px solid rgba(255,255,255,0.08)",
        minHeight: 520,
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
          <Chip size="small" label={orders?.length || 0} />
        </Box>

        <Box sx={{ display: "grid", gap: 1 }}>
          {(orders || []).map((o) => (
            <OrderKanbanCard key={o.id} order={o} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
