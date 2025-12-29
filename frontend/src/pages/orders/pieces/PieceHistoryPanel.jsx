import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Divider, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { apiListAuditEvents } from "../../../api/audit.api";

function safeJson(v) {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "";
  }
}

function ActionChip({ action }) {
  const a = action || "event";
  return <Chip size="small" label={a} />;
}

export default function PieceHistoryPanel({ pieceId, dense = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const columns = useMemo(
    () => [
      {
        field: "at",
        headerName: "Time",
        width: 210,
        renderCell: (params) => {
          const v = params?.row?.at;
          return v ? new Date(v).toLocaleString() : "";
        },
        sortable: false,
      },
      {
        field: "action",
        headerName: "Action",
        width: dense ? 200 : 240,
        renderCell: (params) => <ActionChip action={params?.row?.action} />,
        sortable: false,
      },
      {
        field: "actorRole",
        headerName: "Role",
        width: 140,
        renderCell: (params) => params?.row?.actorRole || "—",
        sortable: false,
      },
      {
        field: "actor",
        headerName: "Actor",
        width: 260,
        renderCell: (params) =>
          params?.row?.actorName || params?.row?.actorUserId || "system",
        sortable: false,
      },
    ],
    [dense]
  );

  async function load() {
    if (!pieceId) {
      setRows([]);
      return;
    }

    setErr("");
    setLoading(true);
    try {
      const r = await apiListAuditEvents({
        entityType: "piece",
        entityId: String(pieceId),
        page: 1,
        limit: 200,
      });

      setRows(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceId]);

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Piece History
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Divider />

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Box sx={{ height: dense ? 320 : 420, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          density={dense ? "compact" : "standard"}
        />
      </Box>
    </Box>
  );
}
