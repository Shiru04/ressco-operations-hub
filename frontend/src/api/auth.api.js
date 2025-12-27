import { http } from "./httpClient";

export async function apiLogin(email, password) {
  const { data } = await http.post("/api/auth/login", { email, password });
  return data.data;
}

export async function apiVerify2FA(tempToken, code) {
  const { data } = await http.post("/api/auth/2fa/verify", { tempToken, code });
  return data.data;
}

export async function apiMe() {
  const { data } = await http.get("/api/auth/me");
  return data.data;
}

// 2FA setup flow (admin temp token required on start)
export async function apiStart2FASetup(tempToken) {
  const { data } = await http.post(
    "/api/auth/2fa/setup/start",
    {},
    { headers: { Authorization: `Bearer ${tempToken}` } }
  );
  return data.data;
}

export async function apiConfirm2FASetup(tempToken, code) {
  const { data } = await http.post("/api/auth/2fa/setup/confirm", {
    tempToken,
    code,
  });
  return data.data;
}
