import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { apiPortalGetOrder } from "../../api/portal.api";

export default function PortalOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await apiPortalGetOrder(id);
        if (!mounted) return;
        setOrder(data);
      } catch (e) {
        if (!mounted) return;
        setErr(`${e.code || "ERROR"}: ${e.message || "Failed to load order"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <Card>
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Order Status
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {order?.orderNumber || id}
            </Typography>
          </Box>

          <Button variant="outlined" onClick={() => navigate("/portal")}>
            Back
          </Button>
        </Box>

        {err ? <Alert severity="error">{err}</Alert> : null}
        {loading ? <Alert severity="info">Loading…</Alert> : null}

        {order ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Typography variant="subtitle2">Status:</Typography>
              <Chip size="small" label={order.status || "—"} />
            </Box>

            <Typography variant="body2">
              <strong>Created:</strong>{" "}
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "—"}
            </Typography>

            <Typography variant="body2">
              <strong>Last updated:</strong>{" "}
              {order.updatedAt
                ? new Date(order.updatedAt).toLocaleString()
                : "—"}
            </Typography>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
