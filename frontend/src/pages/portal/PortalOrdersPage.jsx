import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { apiPortalOrders } from "../../api/portal.api";

export default function PortalOrdersPage() {
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiPortalOrders().then(setRows);
  }, []);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            My Orders
          </Typography>
          <Button variant="contained" onClick={() => navigate("/portal/new")}>
            New Request
          </Button>
        </Box>

        <Box sx={{ height: 440 }}>
          <DataGrid
            rows={rows}
            getRowId={(r) => r._id}
            columns={[
              { field: "orderNumber", headerName: "Order #", width: 180 },
              { field: "status", headerName: "Status", width: 160 },
              {
                field: "createdAt",
                headerName: "Created",
                width: 220,
                valueFormatter: (p) =>
                  p.value ? new Date(p.value).toLocaleString() : "",
              },
            ]}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
