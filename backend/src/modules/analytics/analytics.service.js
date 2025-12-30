const { Order } = require("../orders/orders.model");
const { AuditEvent } = require("../audit/audit.model");
const { ORDER_STATUSES } = require("../../shared/constants/orderStatuses");

/**
 * Query params:
 * - from, to: ISO date strings (optional)
 * - maxRangeDays enforced (default 180)
 */
function parseRange({ from, to, maxRangeDays = 180 } = {}) {
  const now = new Date();
  const end = to ? new Date(to) : now;
  const start = from
    ? new Date(from)
    : new Date(end.getTime() - 30 * 24 * 3600 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const err = new Error("Invalid date range");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }
  if (start > end) {
    const err = new Error("Invalid date range: from must be <= to");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const rangeDays = (end.getTime() - start.getTime()) / (24 * 3600 * 1000);
  if (rangeDays > maxRangeDays) {
    const err = new Error(`Date range too large (max ${maxRangeDays} days)`);
    err.code = "RANGE_TOO_LARGE";
    err.statusCode = 400;
    throw err;
  }

  return { start, end };
}

const DEFAULT_DONE_QUEUE_KEYS = ["completed", "done"];

/**
 * Labor seconds within range (by scanning workLog.startedAt)
 */
async function laborSecondsInRange({ start, end }) {
  const pipeline = [
    {
      $match: {
        $or: [
          { "takeoff.items.workLog.endedAt": { $gte: start, $lte: end } },
          { "takeoff.items.workLog.startedAt": { $gte: start, $lte: end } }, // fallback for older records
        ],
      },
    },
    { $project: { takeoff: 1 } },
    { $unwind: { path: "$takeoff.items", preserveNullAndEmptyArrays: true } },
    {
      $unwind: {
        path: "$takeoff.items.workLog",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "takeoff.items.workLog.startedAt": { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        laborSec: {
          $sum: { $ifNull: ["$takeoff.items.workLog.durationSec", 0] },
        },
        sessions: { $sum: 1 },
      },
    },
  ];

  const [row] = await Order.aggregate(pipeline);
  return { laborSec: row?.laborSec || 0, sessions: row?.sessions || 0 };
}

/**
 * WIP snapshot (current queue distribution) for orders in range (by createdAt) and not cancelled.
 * This is operational, not historical.
 */
async function wipByQueue({
  start,
  end,
  doneQueueKeys = DEFAULT_DONE_QUEUE_KEYS,
}) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $ne: ORDER_STATUSES.CANCELLED },
      },
    },
    { $project: { status: 1, takeoff: 1 } },
    { $unwind: { path: "$takeoff.items", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        pieceStatus: {
          $ifNull: ["$takeoff.items.pieceStatus", "queued"],
        },
      },
    },
    {
      $match: {
        pieceStatus: { $nin: doneQueueKeys },
      },
    },
    {
      $group: {
        _id: "$pieceStatus",
        wipPieces: { $sum: 1 },
      },
    },
    { $sort: { wipPieces: -1 } },
  ];

  const rows = await Order.aggregate(pipeline);
  return rows.map((r) => ({ queueKey: r._id, wipPieces: r.wipPieces || 0 }));
}

/**
 * Completed orders within range: uses AuditEvent action=status_change with changes.to='completed'
 * Returns per-order completedAt, firstInProgressAt, plus derived durations.
 */
async function orderTimesForRange({ start, end }) {
  // Find orders created within range (bounded set) then lookup audit events.
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $project: {
        orderNumber: 1,
        createdAt: 1,
        status: 1,
      },
    },
    {
      $lookup: {
        from: AuditEvent.collection.name,
        let: { oid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$entityType", "order"] },
                  { $eq: ["$entityId", "$$oid"] },
                  { $eq: ["$action", "status_change"] },
                ],
              },
            },
          },
          { $project: { at: 1, changes: 1 } },
        ],
        as: "statusEvents",
      },
    },
    {
      $addFields: {
        inProgressAt: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: "$statusEvents",
                  as: "e",
                  cond: { $eq: ["$$e.changes.to", ORDER_STATUSES.IN_PROGRESS] },
                },
              },
              as: "x",
              in: "$$x.at",
            },
          },
        },
        completedAt: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: "$statusEvents",
                  as: "e",
                  cond: { $eq: ["$$e.changes.to", ORDER_STATUSES.COMPLETED] },
                },
              },
              as: "x",
              in: "$$x.at",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        orderNumber: 1,
        createdAt: 1,
        status: 1,
        inProgressAt: 1,
        completedAt: 1,
      },
    },
  ];

  const rows = await Order.aggregate(pipeline);

  // derive durations in JS to keep pipeline readable and safe
  return rows.map((r) => {
    const createdAt = r.createdAt ? new Date(r.createdAt) : null;
    const inProgressAt = r.inProgressAt ? new Date(r.inProgressAt) : null;
    const completedAt = r.completedAt ? new Date(r.completedAt) : null;

    const leadMs =
      createdAt && completedAt
        ? completedAt.getTime() - createdAt.getTime()
        : null;
    const cycleMs =
      inProgressAt && completedAt
        ? completedAt.getTime() - inProgressAt.getTime()
        : null;

    return {
      id: String(r._id),
      orderNumber: r.orderNumber,
      status: r.status,
      createdAt,
      inProgressAt,
      completedAt,
      leadMs,
      cycleMs,
    };
  });
}

/**
 * Production Overview KPI summary
 */
async function productionOverview(query) {
  const { start, end } = parseRange(query);

  const [labor, wipQueues, times] = await Promise.all([
    laborSecondsInRange({ start, end }),
    wipByQueue({ start, end }),
    orderTimesForRange({ start, end }),
  ]);

  const completed = times.filter((t) => !!t.completedAt);
  const leadVals = completed
    .map((t) => t.leadMs)
    .filter((x) => Number.isFinite(x));
  const cycleVals = completed
    .map((t) => t.cycleMs)
    .filter((x) => Number.isFinite(x));

  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const wipTotalPieces = wipQueues.reduce(
    (sum, q) => sum + (q.wipPieces || 0),
    0
  );

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    kpis: {
      wipPieces: wipTotalPieces,
      completedOrders: completed.length,
      laborHours: Math.round((labor.laborSec / 3600) * 100) / 100,
      avgLeadHours: Math.round((avg(leadVals) / 3600000) * 100) / 100,
      avgCycleHours: Math.round((avg(cycleVals) / 3600000) * 100) / 100,
    },
    wipByQueue: wipQueues,
  };
}

/**
 * Queue analytics:
 * - WIP pieces by queue (current snapshot)
 * - Labor hours by queue (based on workLog within range)
 */
async function productionQueues(query) {
  const { start, end } = parseRange(query);
  const doneQueueKeys = query.doneQueueKeys
    ? String(query.doneQueueKeys)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_DONE_QUEUE_KEYS;

  const [wip, laborRows] = await Promise.all([
    wipByQueue({ start, end, doneQueueKeys }),
    Order.aggregate([
      {
        $match: {
          $or: [
            { "takeoff.items.workLog.endedAt": { $gte: start, $lte: end } },
            { "takeoff.items.workLog.startedAt": { $gte: start, $lte: end } }, // fallback for older records
          ],
        },
      },
      { $project: { takeoff: 1 } },
      { $unwind: { path: "$takeoff.items", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$takeoff.items.workLog",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "takeoff.items.workLog.startedAt": { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            queueKey: { $ifNull: ["$takeoff.items.pieceStatus", "queued"] },
          },
          laborSec: {
            $sum: { $ifNull: ["$takeoff.items.workLog.durationSec", 0] },
          },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { laborSec: -1 } },
    ]),
  ]);

  const laborByQueue = laborRows.map((r) => ({
    queueKey: r._id.queueKey,
    laborHours: Math.round(((r.laborSec || 0) / 3600) * 100) / 100,
    sessions: r.sessions || 0,
  }));

  // merge view
  const merged = new Map();
  for (const q of wip)
    merged.set(q.queueKey, {
      queueKey: q.queueKey,
      wipPieces: q.wipPieces,
      laborHours: 0,
      sessions: 0,
    });
  for (const l of laborByQueue) {
    const curr = merged.get(l.queueKey) || {
      queueKey: l.queueKey,
      wipPieces: 0,
      laborHours: 0,
      sessions: 0,
    };
    merged.set(l.queueKey, {
      ...curr,
      laborHours: l.laborHours,
      sessions: l.sessions,
    });
  }

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    rows: Array.from(merged.values()).sort(
      (a, b) => (b.wipPieces || 0) - (a.wipPieces || 0)
    ),
  };
}

/**
 * User analytics: labor hours and sessions by userId (from workLog.userId)
 */
async function productionUsers(query) {
  const { start, end } = parseRange(query);

  const rows = await Order.aggregate([
    {
      $match: {
        $or: [
          { "takeoff.items.workLog.endedAt": { $gte: start, $lte: end } },
          { "takeoff.items.workLog.startedAt": { $gte: start, $lte: end } }, // fallback for older records
        ],
      },
    },
    { $project: { takeoff: 1 } },
    { $unwind: { path: "$takeoff.items", preserveNullAndEmptyArrays: true } },
    {
      $unwind: {
        path: "$takeoff.items.workLog",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: { "takeoff.items.workLog.startedAt": { $gte: start, $lte: end } },
    },

    {
      $group: {
        _id: "$takeoff.items.workLog.userId",
        laborSec: {
          $sum: { $ifNull: ["$takeoff.items.workLog.durationSec", 0] },
        },
        sessions: { $sum: 1 },
      },
    },

    // 🔑 JOIN USERS
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        userId: "$_id",
        name: "$user.name",
        email: "$user.email",
        laborHours: {
          $round: [{ $divide: ["$laborSec", 3600] }, 2],
        },
        sessions: 1,
      },
    },

    { $sort: { laborHours: -1 } },
  ]);

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    rows,
  };
}

/**
 * Orders analytics table:
 * - shows labor hours per order (from workLog within range)
 * - shows lead/cycle if available from audit events
 */
async function ordersAnalytics(query) {
  const { start, end } = parseRange(query);
  const status = query.status ? String(query.status).trim() : null;

  // base orders set
  const baseMatch = {
    createdAt: { $gte: start, $lte: end },
  };
  if (status) baseMatch.status = status;

  // compute labor per order (within range by workLog.startedAt)
  const labor = await Order.aggregate([
    { $match: baseMatch },
    {
      $project: {
        orderNumber: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        takeoff: 1,
      },
    },
    { $unwind: { path: "$takeoff.items", preserveNullAndEmptyArrays: true } },
    {
      $unwind: {
        path: "$takeoff.items.workLog",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: { "takeoff.items.workLog.startedAt": { $gte: start, $lte: end } },
    },
    {
      $group: {
        _id: "$_id",
        orderNumber: { $first: "$orderNumber" },
        status: { $first: "$status" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        laborSec: {
          $sum: { $ifNull: ["$takeoff.items.workLog.durationSec", 0] },
        },
        sessions: { $sum: 1 },
      },
    },
    { $sort: { updatedAt: -1 } },
  ]);

  // enrich with lead/cycle by audit lookup (bounded)
  const times = await orderTimesForRange({ start, end });
  const timeById = new Map(times.map((t) => [t.id, t]));

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    items: labor.map((r) => {
      const id = String(r._id);
      const t = timeById.get(id);
      return {
        id,
        orderNumber: r.orderNumber,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        laborHours: Math.round(((r.laborSec || 0) / 3600) * 100) / 100,
        sessions: r.sessions || 0,
        leadHours: t?.leadMs
          ? Math.round((t.leadMs / 3600000) * 100) / 100
          : null,
        cycleHours: t?.cycleMs
          ? Math.round((t.cycleMs / 3600000) * 100) / 100
          : null,
      };
    }),
  };
}

module.exports = {
  productionOverview,
  productionQueues,
  productionUsers,
  ordersAnalytics,
};
