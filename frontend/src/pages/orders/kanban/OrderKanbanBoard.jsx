import React, { useMemo } from "react";
import { Box } from "@mui/material";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import OrderKanbanColumn from "./OrderKanbanColumn";

/**
 * We treat each card as draggable. Dropping onto a column moves status.
 * Minimal, production-friendly, no over-engineering.
 */
export default function OrderKanbanBoard({
  columns,
  groupedOrders,
  onMoveRequest,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Flatten ids for SortableContext per column
  const columnIds = useMemo(() => columns.map((c) => c.key), [columns]);

  function findContainerByOrderId(orderId) {
    for (const c of columns) {
      const list = groupedOrders?.[c.key] || [];
      if (list.some((o) => o.id === orderId)) return c.key;
    }
    return null;
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const orderId = String(active.id);

    const fromStatus = findContainerByOrderId(orderId);
    const toStatus = String(over.id).startsWith("col:")
      ? String(over.id).replace("col:", "")
      : findContainerByOrderId(String(over.id));

    if (!fromStatus || !toStatus || fromStatus === toStatus) return;

    onMoveRequest?.({ orderId, fromStatus, toStatus });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: `repeat(${columnIds.length}, 1fr)`,
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        {columns.map((c) => {
          const items = groupedOrders?.[c.key] || [];
          const ids = items.map((o) => o.id);

          return (
            <SortableContext
              key={c.key}
              items={ids}
              strategy={verticalListSortingStrategy}
            >
              <OrderKanbanColumn column={c} orders={items} />
            </SortableContext>
          );
        })}
      </Box>
    </DndContext>
  );
}
