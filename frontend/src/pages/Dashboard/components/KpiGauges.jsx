import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function GaugeCard({ label, value, unit, max, subtitle }) {
  const v = Number(value) || 0;
  const m = Number(max) || 1;
  const pct = clamp((v / m) * 100, 0, 100);

  return (
    <Card>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <CircularProgress
            variant="determinate"
            value={pct}
            size={72}
            thickness={5}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 900 }}>
              {Math.round(pct)}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 900, lineHeight: 1.1 }}
          >
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {Number.isFinite(v) ? v : 0}
            {unit ? <Typography component="span"> {unit}</Typography> : null}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {subtitle ? subtitle : `Gauge max: ${m}${unit ? ` ${unit}` : ""}`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function KpiGauges({ kpis }) {
  const items = useMemo(() => {
    const wipPieces = kpis?.wipPieces ?? 0;
    const completedOrders = kpis?.completedOrders ?? 0;
    const laborHours = kpis?.laborHours ?? 0;
    const avgLeadHours = kpis?.avgLeadHours ?? 0;
    const avgCycleHours = kpis?.avgCycleHours ?? 0;

    return [
      {
        id: "wip",
        label: "WIP Pieces",
        value: wipPieces,
        unit: "",
        max: 250,
        subtitle: "Current WIP snapshot (excluding done queues).",
      },
      {
        id: "completed",
        label: "Completed Orders",
        value: completedOrders,
        unit: "",
        max: 80,
        subtitle: "Orders completed in selected range.",
      },
      {
        id: "labor",
        label: "Labor Hours",
        value: laborHours,
        unit: "hrs",
        max: 200,
        subtitle: "Total labor from work logs.",
      },
      {
        id: "lead",
        label: "Avg Lead Time",
        value: avgLeadHours,
        unit: "hrs",
        max: 72,
        subtitle: "Created → Completed.",
      },
      {
        id: "cycle",
        label: "Avg Cycle Time",
        value: avgCycleHours,
        unit: "hrs",
        max: 48,
        subtitle: "In Progress → Completed.",
      },
    ];
  }, [kpis]);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "1fr 1fr",
          lg: "repeat(5, 1fr)",
        },
      }}
    >
      {items.map(({ id, ...props }) => (
        <GaugeCard key={id} {...props} />
      ))}
    </Box>
  );
}
