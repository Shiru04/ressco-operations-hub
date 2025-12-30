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
import { apiAnalyticsProductionUsers } from "../../api/analytics.api";

export default function UsersDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Name", width: 220 },
      { field: "email", headerName: "Email", width: 260 },
      { field: "laborHours", headerName: "Labor Hours", width: 160 },
      { field: "sessions", headerName: "Work Sessions", width: 160 },
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
      const r = await apiAnalyticsProductionUsers(params);
      setData(r);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
            Users Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Labor is aggregated from workLog entries within the date range.
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

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            By User
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={(data?.rows || []).map((r, i) => ({
                id: `${r.userId}-${i}`,
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
