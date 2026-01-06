import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import { useAuth } from "../../app/providers/AuthProvider";
import { apiGetProductionBoard } from "../../api/production.api";
import {
  apiCreateUser,
  apiEnforceUser2FA,
  apiListUsers,
  apiPatchUser,
  apiPatchUserProductionQueues,
  apiResetUserPassword,
} from "../../api/users.api";
import { apiListCustomers } from "../../api/customers.api";

function RoleChip({ role }) {
  return <Chip size="small" label={role || "—"} />;
}

function boolLabel(v) {
  return v ? "Yes" : "No";
}

function normalizeQueueSelection(queues) {
  const arr = Array.isArray(queues) ? queues : [];
  return arr.map((q, idx) => ({
    key: String(q.key || "").trim(),
    order: Number.isFinite(q.order) ? Number(q.order) : idx + 1,
    isActive: q.isActive === undefined ? true : !!q.isActive,
  }));
}

export default function UsersAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "production",
    password: "",
    customerIds: [],
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editPatch, setEditPatch] = useState({
    name: "",
    role: "",
    isActive: true,
    customerIds: [],
  });

  const [editQueues, setEditQueues] = useState([]);
  const [edit2fa, setEdit2fa] = useState(false);

  // RESTORED: reset password on edit
  const [editTempPassword, setEditTempPassword] = useState("");

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Name", width: 220 },
      { field: "email", headerName: "Email", width: 260 },
      {
        field: "role",
        headerName: "Role",
        width: 140,
        sortable: false,
        renderCell: (params) => <RoleChip role={params?.row?.role} />,
      },
      {
        field: "isActive",
        headerName: "Active",
        width: 110,
        valueFormatter: (value) => boolLabel(!!value),
      },
      {
        field: "twoFAEnabled",
        headerName: "2FA",
        width: 110,
        valueFormatter: (value) => boolLabel(!!value),
      },
      {
        field: "productionQueues",
        headerName: "Queues",
        flex: 1,
        minWidth: 240,
        valueFormatter: (value) =>
          (Array.isArray(value) ? value : [])
            .filter((q) => q?.key)
            .map((q) => q.key)
            .join(", "),
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 190,
        valueFormatter: (value) =>
          value ? new Date(value).toLocaleString() : "",
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 190,
        valueFormatter: (value) =>
          value ? new Date(value).toLocaleString() : "",
      },
    ],
    []
  );

  async function load() {
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      const [u, board, c] = await Promise.all([
        apiListUsers({}),
        apiGetProductionBoard(),
        apiListCustomers({ q: "", page: 1, limit: 500 }),
      ]);

      setUsers(u?.items || []);

      const cols = (board?.columns || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setQueues(cols.map((col) => ({ key: col.key, label: col.label })));

      setCustomers(
        (c?.items || []).map((x) => ({
          id: x.id || x._id,
          name: x.name || "",
          email: x.email || "",
        }))
      );
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function openEdit(row) {
    setOkMsg("");
    setErr("");
    setEditUser(row);

    setEditPatch({
      name: row.name || "",
      role: row.role || "",
      isActive: !!row.isActive,
      customerIds: Array.isArray(row.customerIds) ? row.customerIds : [],
    });

    setEdit2fa(!!row.twoFAEnabled);

    const pq = normalizeQueueSelection(row.productionQueues || []);
    setEditQueues(pq.filter((x) => x.isActive !== false).map((x) => x.key));

    setEditTempPassword("");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUser?.id) return;

    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      // 1) Normal patch (NO password here)
      const patch = {
        name: editPatch.name,
        role: editPatch.role,
        isActive: !!editPatch.isActive,
        customerIds:
          editPatch.role === "customer" ? editPatch.customerIds || [] : [],
      };

      await apiPatchUser(editUser.id, patch);

      // 2) 2FA flag
      await apiEnforceUser2FA(editUser.id, !!edit2fa);

      // 3) Production queues
      const payloadQueues = (editQueues || []).map((k, idx) => ({
        key: k,
        order: idx + 1,
        isActive: true,
      }));
      await apiPatchUserProductionQueues(editUser.id, payloadQueues);

      // 4) Password reset (separate call) ONLY if provided
      if (editTempPassword && editTempPassword.trim().length >= 8) {
        await apiResetUserPassword(editUser.id, editTempPassword.trim());
      }

      setEditOpen(false);
      setEditUser(null);
      setEditTempPassword("");
      setOkMsg("Saved.");
      await load();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      await apiCreateUser({
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        password: createForm.password,
        customerIds:
          createForm.role === "customer" ? createForm.customerIds : [],
      });

      setCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        role: "production",
        password: "",
        customerIds: [],
      });

      setOkMsg("User created.");
      await load();
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="error">Access denied. Admin only.</Alert>
      </Box>
    );
  }

  const canCreate =
    !!createForm.name &&
    !!createForm.email &&
    !!createForm.password &&
    (createForm.role !== "customer" ||
      (createForm.customerIds || []).length > 0);

  const isEditCustomer = editPatch.role === "customer";

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
            Users
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Create users, assign roles, enforce 2FA, configure production
            queues, and link portal users to customers.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            disabled={loading}
          >
            Create user
          </Button>
        </Box>
      </Box>

      {err ? <Alert severity="error">{err}</Alert> : null}
      {okMsg ? <Alert severity="success">{okMsg}</Alert> : null}

      <Card>
        <CardContent>
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={users}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              disableRowSelectionOnClick
              onRowClick={(p) => openEdit(p.row)}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create user</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, name: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Email"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, email: e.target.value }))
            }
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  role: e.target.value,
                  customerIds: [],
                }))
              }
            >
              <MenuItem value="admin">admin</MenuItem>
              <MenuItem value="supervisor">supervisor</MenuItem>
              <MenuItem value="sales">sales</MenuItem>
              <MenuItem value="production">production</MenuItem>
              <MenuItem value="customer">customer</MenuItem>
            </Select>
          </FormControl>

          {createForm.role === "customer" ? (
            <FormControl fullWidth>
              <InputLabel>Linked Customers</InputLabel>
              <Select
                multiple
                label="Linked Customers"
                value={createForm.customerIds}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, customerIds: e.target.value }))
                }
                renderValue={(selected) => {
                  const ids = Array.isArray(selected) ? selected : [];
                  const names = ids
                    .map((id) => customers.find((c) => c.id === id)?.name || id)
                    .join(", ");
                  return names || "—";
                }}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <TextField
            label="Temporary password"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, password: e.target.value }))
            }
            fullWidth
            helperText="This value is not stored. The backend hashes it into passwordHash."
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={create}
            disabled={!canCreate || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {editUser?.email}
          </Typography>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Name"
              value={editPatch.name}
              onChange={(e) =>
                setEditPatch((p) => ({ ...p, name: e.target.value }))
              }
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={editPatch.role}
                onChange={(e) =>
                  setEditPatch((p) => ({
                    ...p,
                    role: e.target.value,
                    customerIds: [],
                  }))
                }
              >
                <MenuItem value="admin">admin</MenuItem>
                <MenuItem value="supervisor">supervisor</MenuItem>
                <MenuItem value="sales">sales</MenuItem>
                <MenuItem value="production">production</MenuItem>
                <MenuItem value="customer">customer</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={!!editPatch.isActive}
                onChange={(e) =>
                  setEditPatch((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              <Typography variant="body2">Active</Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={!!edit2fa}
                onChange={(e) => setEdit2fa(e.target.checked)}
              />
              <Typography variant="body2">2FA enabled</Typography>
            </Box>
          </Box>

          {/* RESTORED */}
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Password
            </Typography>
            <TextField
              label="New temporary password"
              type="password"
              value={editTempPassword}
              onChange={(e) => setEditTempPassword(e.target.value)}
              fullWidth
              helperText="Optional. If provided, it will reset the user's password."
            />
          </Box>

          {/* Only show when role is customer */}
          {isEditCustomer ? (
            <>
              <Divider />
              <Box sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Portal customer linkage
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>Linked Customers</InputLabel>
                  <Select
                    multiple
                    label="Linked Customers"
                    value={editPatch.customerIds || []}
                    onChange={(e) =>
                      setEditPatch((p) => ({
                        ...p,
                        customerIds: e.target.value,
                      }))
                    }
                    renderValue={(selected) => {
                      const ids = Array.isArray(selected) ? selected : [];
                      const names = ids
                        .map(
                          (id) => customers.find((c) => c.id === id)?.name || id
                        )
                        .join(", ");
                      return names || "—";
                    }}
                  >
                    {customers.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info">
                  If no customers are linked, the portal will show an empty view
                  and cannot create requests.
                </Alert>
              </Box>
            </>
          ) : null}

          <Divider />

          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Production queues
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Queues</InputLabel>
              <Select
                multiple
                label="Queues"
                value={editQueues}
                onChange={(e) => setEditQueues(e.target.value)}
                renderValue={(selected) => selected.join(", ")}
              >
                {queues.map((q) => (
                  <MenuItem key={q.key} value={q.key}>
                    {q.label} ({q.key})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              Queue membership does not change `pieceStatus`/`assignedQueueKey`;
              it only defines assignable queues for the user.
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveEdit}
            disabled={loading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
