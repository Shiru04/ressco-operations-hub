import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import TakeoffBuilder from "../orders/takeoff/TakeoffBuilder";
import {
  apiPortalCreateOrderRequest,
  apiPortalCustomers,
  apiPortalPatchOrderTakeoff,
} from "../../api/portal.api";

export default function PortalTakeoffRequestPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");

  const [orderId, setOrderId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [initialTakeoff, setInitialTakeoff] = useState({
    header: {},
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const rows = await apiPortalCustomers();
        if (!mounted) return;

        setCustomers(rows || []);

        if ((rows || []).length === 1) {
          setCustomerId(rows[0].id);
        } else if ((rows || []).length > 1) {
          setCustomerId(rows[0].id);
        } else {
          setCustomerId("");
        }
      } catch (e) {
        if (!mounted) return;
        setErr(`${e.code}: ${e.message}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasLinkedCustomers = customers.length > 0;
  const showSelector = customers.length > 1;

  const canStart = useMemo(() => {
    return !!customerId && !orderId && !loading;
  }, [customerId, orderId, loading]);

  async function startRequest() {
    setErr("");
    setLoading(true);
    try {
      const created = await apiPortalCreateOrderRequest({ customerId });
      setOrderId(created.id);
      setOrderNumber(created.orderNumber);
      setInitialTakeoff(created.takeoff || { header: {}, items: [] });
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

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
              New Order Request
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Build your takeoff. This creates an order in{" "}
              <strong>received</strong> status and saves automatically.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate("/portal")}>
            Back
          </Button>
        </Box>

        {err ? <Alert severity="error">{err}</Alert> : null}

        {!hasLinkedCustomers ? (
          <Alert severity="warning">
            Your portal account is not linked to any customer record yet. Please
            contact Ressco to activate your account.
          </Alert>
        ) : null}

        {!orderId ? (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Alert severity="info">
              This portal account can only create requests for customers
              assigned by admin.
            </Alert>

            {showSelector ? (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Box sx={{ minWidth: 320, flex: 1 }}>
                  <Select
                    fullWidth
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={loading}
                  >
                    {customers.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name || c.email || c.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                <Button
                  variant="contained"
                  disabled={!canStart}
                  onClick={startRequest}
                >
                  Start Request
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  disabled={!canStart}
                  onClick={startRequest}
                >
                  Start Request
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Alert severity="success">
              Request created: <strong>{orderNumber}</strong>. Add takeoff lines
              below.
            </Alert>

            <TakeoffBuilder
              orderId={orderId}
              initialTakeoff={initialTakeoff}
              showPdf={false}
              saveAdapter={async (id, payload) => {
                return apiPortalPatchOrderTakeoff(id, payload);
              }}
              onSaved={(takeoff) => {
                setInitialTakeoff(takeoff || { header: {}, items: [] });
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="contained" onClick={() => navigate("/portal")}>
                Finish
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
