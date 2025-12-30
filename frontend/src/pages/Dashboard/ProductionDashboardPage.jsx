import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import KpiCards from "./components/KpiCards";
import {
  apiAnalyticsProductionOverview,
  apiAnalyticsProductionQueues,
} from "../../api/analytics.api";

export default function ProductionDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [overview, setOverview] = useState(null);
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const columns = useMemo(
    () => [
      { field: "queueKey", headerName: "Queue", width: 220 },
      { field: "wipPieces", headerName: "WIP Pieces", width: 140 },
      { field: "laborHours", headerName: "Labor Hours", width: 140 },
      { field: "sessions", headerName: "Work Sessions", width: 150 },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const [a, b] = await Promise.all([
        apiAnalyticsProductionOverview(params),
        apiAnalyticsProductionQueues(params),
      ]);
      setOverview(a);
      setQueues(b);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* default last 30d */
  }, []); // eslint-disable-line

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Production Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            KPIs are server-derived from work logs and audit status events.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={load} disabled={loading}>
            Apply
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <KpiCards kpis={overview?.kpis} />

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Queues
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ height: 520, width: "100%" }}>
            <DataGrid
              rows={(queues?.rows || []).map((r, i) => ({
                id: `${r.queueKey}-${i}`,
                ...r,
              }))}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
