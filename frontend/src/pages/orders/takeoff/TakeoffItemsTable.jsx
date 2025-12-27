import React, { useMemo } from "react";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function TakeoffItemsTable({ items, onRemove }) {
  const columns = useMemo(
    () => [
      { field: "lineNo", headerName: "#", width: 80 },
      { field: "typeCode", headerName: "Type", width: 110 },
      { field: "qty", headerName: "Qty", width: 90 },
      { field: "ga", headerName: "GA", width: 90 },
      { field: "material", headerName: "Material", width: 130 },
      {
        field: "measurements",
        headerName: "Measurements",
        flex: 1,
        minWidth: 260,
        valueGetter: (params) => {
          const m = params.row?.measurements || {};
          return Object.entries(m)
            .filter(
              ([, v]) =>
                v !== null && v !== undefined && String(v).trim() !== ""
            )
            .map(([k, v]) => `${k}:${v}`)
            .join("  ");
        },
      },
      { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 220 },
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onRemove(params.row.id)}
          >
            Remove
          </Button>
        ),
      },
    ],
    [onRemove]
  );

  return (
    <Card>
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Takeoff Lines
        </Typography>

        <Box sx={{ height: 520, width: "100%" }}>
          <DataGrid
            rows={items || []}
            columns={columns}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
          />
        </Box>
      </CardContent>
    </Card>
  );
}
