import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Divider,
  Typography,
} from "@mui/material";

function emptyContact() {
  return { name: "", email: "", phone: "", title: "" };
}

export default function CustomerFormDialog({
  open,
  onClose,
  initial,
  onSubmit,
}) {
  const isEdit = !!initial?.id;

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hoursTarget, setHoursTarget] = useState(48);
  const [priority, setPriority] = useState("normal");
  const [contacts, setContacts] = useState([emptyContact()]);

  useEffect(() => {
    if (!open) return;

    setName(initial?.name || "");
    setNotes(initial?.notes || "");
    setHoursTarget(initial?.sla?.hoursTarget ?? 48);
    setPriority(initial?.sla?.priority ?? "normal");

    const initContacts = (initial?.contacts || []).map((c) => ({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      title: c.title || "",
    }));

    setContacts(initContacts.length ? initContacts : [emptyContact()]);
  }, [open, initial]);

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  function updateContact(i, patch) {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    );
  }

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()]);
  }

  function removeContact(i) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    const payload = {
      name: name.trim(),
      notes: notes || "",
      sla: { hoursTarget: Number(hoursTarget) || 48, priority },
      contacts: contacts
        .map((c) => ({
          name: c.name.trim(),
          email: c.email?.trim() || null,
          phone: c.phone?.trim() || null,
          title: c.title?.trim() || null,
        }))
        .filter((c) => c.name.length >= 2),
    };

    await onSubmit(payload);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Customer Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="SLA Hours Target"
              type="number"
              value={hoursTarget}
              onChange={(e) => setHoursTarget(e.target.value)}
            />
            <TextField
              label="Priority (low/normal/high/critical)"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              helperText="Keep as one of: low, normal, high, critical"
            />
          </Box>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
          />

          <Divider />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Contacts
          </Typography>

          <Box sx={{ display: "grid", gap: 2 }}>
            {contacts.map((c, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                  p: 2,
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 2,
                }}
              >
                <TextField
                  label="Name"
                  value={c.name}
                  onChange={(e) => updateContact(idx, { name: e.target.value })}
                />
                <TextField
                  label="Title"
                  value={c.title}
                  onChange={(e) =>
                    updateContact(idx, { title: e.target.value })
                  }
                />
                <TextField
                  label="Email"
                  value={c.email}
                  onChange={(e) =>
                    updateContact(idx, { email: e.target.value })
                  }
                />
                <TextField
                  label="Phone"
                  value={c.phone}
                  onChange={(e) =>
                    updateContact(idx, { phone: e.target.value })
                  }
                />

                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                  }}
                >
                  {contacts.length > 1 ? (
                    <Button
                      variant="outlined"
                      onClick={() => removeContact(idx)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Box>

          <Button variant="outlined" onClick={addContact}>
            Add Contact
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSave} onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
