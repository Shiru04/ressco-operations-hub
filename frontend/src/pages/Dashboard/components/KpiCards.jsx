import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";

function KpiCard({ label, value }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function KpiCards({ kpis }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
      }}
    >
      <KpiCard label="WIP Pieces" value={kpis?.wipPieces ?? 0} />
      <KpiCard label="Completed Orders" value={kpis?.completedOrders ?? 0} />
      <KpiCard label="Labor Hours" value={kpis?.laborHours ?? 0} />
      <KpiCard label="Avg Lead (hrs)" value={kpis?.avgLeadHours ?? 0} />
      <KpiCard label="Avg Cycle (hrs)" value={kpis?.avgCycleHours ?? 0} />
    </Box>
  );
}
