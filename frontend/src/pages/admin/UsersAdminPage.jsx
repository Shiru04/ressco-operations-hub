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
} from "../../api/users.api";

function RoleChip({ role }) {
  return <Chip size="small" label={role || "—"} />;
}

function boolLabel(v) {
  return v ? "Yes" : "No";
}

function normalizeQueueSelection(queues) {
  const arr = Array.isArray(queues) ? queues : [];
  // ensure shape: { key, order, isActive }
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
  const [queues, setQueues] = useState([]); // from production board columns
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "production",
    password: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editPatch, setEditPatch] = useState({
    name: "",
    role: "",
    isActive: true,
  });
  const [editQueues, setEditQueues] = useState([]); // array of keys
  const [edit2fa, setEdit2fa] = useState(false);

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
      const [u, board] = await Promise.all([
        apiListUsers({}),
        apiGetProductionBoard(),
      ]);

      setUsers(u?.items || []);
      const cols = (board?.columns || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setQueues(cols.map((c) => ({ key: c.key, label: c.label })));
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
    });
    setEdit2fa(!!row.twoFAEnabled);
    const pq = normalizeQueueSelection(row.productionQueues || []);
    setEditQueues(pq.filter((x) => x.isActive !== false).map((x) => x.key));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUser?.id) return;

    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      // 1) patch name/role/isActive
      await apiPatchUser(editUser.id, {
        name: editPatch.name,
        role: editPatch.role,
        isActive: !!editPatch.isActive,
      });

      // 2) enforce 2FA (admin-only policy will still be enforced by your middleware/logic)
      await apiEnforceUser2FA(editUser.id, !!edit2fa);

      // 3) production queues
      const payloadQueues = (editQueues || []).map((k, idx) => ({
        key: k,
        order: idx + 1,
        isActive: true,
      }));
      await apiPatchUserProductionQueues(editUser.id, payloadQueues);

      setEditOpen(false);
      setEditUser(null);
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
      });
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "production", password: "" });
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
            Create users, assign roles, enforce 2FA, and configure production
            queue memberships.
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
                setCreateForm((p) => ({ ...p, role: e.target.value }))
              }
            >
              <MenuItem value="admin">admin</MenuItem>
              <MenuItem value="supervisor">supervisor</MenuItem>
              <MenuItem value="sales">sales</MenuItem>
              <MenuItem value="production">production</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Temporary password"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, password: e.target.value }))
            }
            fullWidth
          />
          <Alert severity="info">
            Admin 2FA enforcement rules remain server-side. Create the user,
            then edit to enforce 2FA if needed.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={create}
            disabled={
              !createForm.name ||
              !createForm.email ||
              !createForm.password ||
              loading
            }
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
                  setEditPatch((p) => ({ ...p, role: e.target.value }))
                }
              >
                <MenuItem value="admin">admin</MenuItem>
                <MenuItem value="supervisor">supervisor</MenuItem>
                <MenuItem value="sales">sales</MenuItem>
                <MenuItem value="production">production</MenuItem>
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

          <Divider />

          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Production queues
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Select which queues this user can be assigned to.
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
