import React from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function OrderKanbanCard({ order }) {
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} variant="outlined">
      <CardActionArea
        onClick={() => navigate(`/orders/${order.id}`)}
        sx={{ cursor: "pointer" }}
      >
        <CardContent sx={{ display: "grid", gap: 1, p: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography sx={{ fontWeight: 900 }}>
              {order.orderNumber}
            </Typography>
            <Chip size="small" label={order.priority || "normal"} />
          </Box>

          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Source: {order.source || "pos"}
          </Typography>

          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Updated:{" "}
            {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : ""}
          </Typography>

          {/* Drag handle zone */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              mt: 0.5,
              p: 0.75,
              borderRadius: 1,
              bgcolor: "rgba(255,255,255,0.04)",
              textAlign: "center",
              fontSize: 12,
              opacity: 0.85,
              userSelect: "none",
            }}
          >
            Drag
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
