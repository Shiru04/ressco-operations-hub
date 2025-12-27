const ORDER_STATUSES = Object.freeze({
  RECEIVED: "received",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  CANCELLED: "cancelled",
});

// Allowed transitions (v1)
// Note: "received" can go to "approved" or "cancelled"
// "approved" can go to "in_progress", "on_hold", "cancelled"
// "in_progress" can go to "completed", "on_hold", "cancelled"
// "on_hold" can go back to "in_progress" or "cancelled"
const STATUS_TRANSITIONS = Object.freeze({
  received: ["approved", "cancelled"],
  approved: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["completed", "on_hold", "cancelled"],
  completed: [],
  on_hold: ["in_progress", "cancelled"],
  cancelled: [],
});

module.exports = { ORDER_STATUSES, STATUS_TRANSITIONS };
