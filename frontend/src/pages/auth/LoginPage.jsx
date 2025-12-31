import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import {
  apiConfirm2FASetup,
  apiLogin,
  apiStart2FASetup,
  apiVerify2FA,
  apiMe,
} from "../../api/auth.api";
import { useAuth } from "../../app/providers/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  useEffect(() => {
    setStep("login");
    setErr("");
    setCode("");
    // do not clear tempToken automatically; keep it if user navigated back
  }, []);

  const { setSession } = useAuth();

  const [step, setStep] = useState("login"); // login | verify2fa | setup2fa
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const [setup, setSetup] = useState(null); // {otpauthUrl, secretBase32}

  const canSubmit = useMemo(() => {
    if (step === "login") return email && password;
    if (step === "verify2fa") return tempToken && code;
    if (step === "setup2fa") return tempToken && code;
    return false;
  }, [step, email, password, tempToken, code]);

  function postLoginRedirect(me) {
    if (me?.role === "customer") navigate("/portal", { replace: true });
    else navigate("/", { replace: true });
  }

  async function handleLogin() {
    setErr("");
    setLoading(true);
    try {
      const result = await apiLogin(email, password);

      if (result.requires2fa) {
        setTempToken(result.tempToken);

        if (result.needs2faSetup) {
          const setupData = await apiStart2FASetup(result.tempToken);
          setSetup(setupData);
          setStep("setup2fa");
        } else {
          setStep("verify2fa");
        }
        return;
      }

      // Non-2FA roles
      localStorage.setItem("auth_token", result.token);
      const me = await apiMe();
      setSession(result.token, me);
      postLoginRedirect(me);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA() {
    setErr("");
    setLoading(true);
    try {
      const result = await apiVerify2FA(tempToken, code);
      localStorage.setItem("auth_token", result.token);
      const me = await apiMe();
      setSession(result.token, me);
      postLoginRedirect(me);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSetup() {
    setErr("");
    setLoading(true);
    try {
      const result = await apiConfirm2FASetup(tempToken, code);
      localStorage.setItem("auth_token", result.token);
      const me = await apiMe();
      setSession(result.token, me);
      postLoginRedirect(me);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 800 }}>
            Sign in
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
            Ressco Operations Hub
          </Typography>

          {err ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          ) : null}

          {step === "login" && (
            <Box sx={{ display: "grid", gap: 2 }}>
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={!canSubmit || loading}
                startIcon={loading ? <CircularProgress size={18} /> : null}
              >
                Continue
              </Button>
            </Box>
          )}

          {step === "verify2fa" && (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Alert severity="info">
                2FA required. Enter your authenticator code.
              </Alert>

              <TextField
                label="Temporary Token"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                multiline
                minRows={2}
              />

              <TextField
                label="2FA Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <Button
                variant="contained"
                onClick={handleVerify2FA}
                disabled={!canSubmit || loading}
                startIcon={loading ? <CircularProgress size={18} /> : null}
              >
                Verify
              </Button>

              <Button
                variant="text"
                onClick={async () => {
                  setErr("");
                  setLoading(true);
                  try {
                    const setupData = await apiStart2FASetup(tempToken);
                    setSetup(setupData);
                    setStep("setup2fa");
                  } catch (e) {
                    setErr(`${e.code}: ${e.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Need to set up 2FA?
              </Button>
            </Box>
          )}

          {step === "setup2fa" && (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Alert severity="warning">
                Admin 2FA must be configured. Scan the QR code, then enter a
                code to confirm.
              </Alert>

              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                {setup?.otpauthUrl ? (
                  <QRCodeSVG value={setup.otpauthUrl} size={200} />
                ) : (
                  <Typography variant="body2">No QR data</Typography>
                )}
              </Box>

              <TextField
                label="Manual secret (Base32)"
                value={setup?.secretBase32 || ""}
                InputProps={{ readOnly: true }}
              />

              <TextField
                label="Temporary Token"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                multiline
                minRows={2}
              />

              <TextField
                label="2FA Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <Button
                variant="contained"
                onClick={handleConfirmSetup}
                disabled={!canSubmit || loading}
                startIcon={loading ? <CircularProgress size={18} /> : null}
              >
                Confirm 2FA Setup
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
