import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import TakeoffBuilder from "../orders/takeoff/TakeoffBuilder";
import {
  apiPortalCreateOrderRequest,
  apiPortalCustomers,
  apiPortalGetLastDraft,
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

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Draft recovery UI state
  const [draft, setDraft] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);

  const hasLinkedCustomers = customers.length > 0;

  const isReadyToBuild = useMemo(() => {
    return !!orderId && !!customerId && !loading;
  }, [orderId, customerId, loading]);

  async function createNewRequest(forCustomerId) {
    const created = await apiPortalCreateOrderRequest({
      customerId: forCustomerId,
    });
    setOrderId(created.id);
    setOrderNumber(created.orderNumber);
    setInitialTakeoff(created.takeoff || { header: {}, items: [] });
  }

  function resumeDraft(d) {
    setOrderId(d.id);
    setOrderNumber(d.orderNumber || "");
    setInitialTakeoff(d.takeoff || { header: {}, items: [] });
  }

  async function bootstrap() {
    setLoading(true);
    setErr("");

    try {
      // 1) Load linked customers
      const rows = await apiPortalCustomers();
      setCustomers(rows || []);

      if (!rows || rows.length === 0) {
        setCustomerId("");
        setDraft(null);
        setDraftOpen(false);
        return;
      }

      // If there are multiple customers, we still auto-pick the first to avoid selection UI.
      // If you later want multi-customer support, we can add an account-level "defaultCustomerId".
      const cid = rows[0].id;
      setCustomerId(cid);

      // 2) Check last draft
      const d = await apiPortalGetLastDraft(cid);

      if (d?.id) {
        setDraft(d);
        setDraftOpen(true);
        // Do NOT auto-create a new order; wait for user choice.
        return;
      }

      // 3) No draft -> auto-create a new request
      await createNewRequest(cid);
    } catch (e) {
      setErr(
        `${e.code || "ERROR"}: ${e.message || "Failed to initialize request"}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await bootstrap();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartNew() {
    if (!customerId) return;

    setErr("");
    setLoading(true);
    try {
      setDraftOpen(false);
      setDraft(null);
      await createNewRequest(customerId);
    } catch (e) {
      setErr(
        `${e.code || "ERROR"}: ${e.message || "Failed to start a new request"}`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResume() {
    if (!draft?.id) return;
    setDraftOpen(false);
    resumeDraft(draft);
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
              Build your takeoff. Your request is saved automatically.
            </Typography>
          </Box>

          <Button variant="outlined" onClick={() => navigate("/portal")}>
            Back
          </Button>
        </Box>

        {err ? <Alert severity="error">{err}</Alert> : null}

        {!hasLinkedCustomers && !loading ? (
          <Alert severity="warning">
            Your portal account is not linked to any customer record yet. Please
            contact Ressco to activate your account.
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Preparing your request…</Typography>
          </Box>
        ) : null}

        {isReadyToBuild ? (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Alert severity="success">
              Working on: <strong>{orderNumber}</strong>.
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
        ) : null}

        {/* Draft recovery dialog: force choice (no close icon / backdrop close) */}
        <Dialog
          open={draftOpen}
          onClose={() => {}}
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle>Resume your last request?</DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              We found an unfinished request. Would you like to resume it or
              start a new one?
            </Typography>

            <Typography sx={{ fontWeight: 900 }}>
              {draft?.orderNumber || "Previous Request"}
            </Typography>

            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Starting a new request will generate a new order.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button variant="outlined" onClick={() => navigate("/portal")}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              onClick={handleStartNew}
              disabled={loading}
            >
              Start New
            </Button>
            <Button
              variant="contained"
              onClick={handleResume}
              disabled={!draft?.id}
            >
              Resume
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
