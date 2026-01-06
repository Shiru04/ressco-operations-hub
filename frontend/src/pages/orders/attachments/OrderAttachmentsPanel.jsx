import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiDeleteAttachment,
  apiDownloadAttachmentBlob,
  apiListOrderAttachments,
  apiListPieceAttachments,
  apiUploadOrderAttachment,
  apiUploadPieceAttachment,
} from "../../../api/attachments.api";

function bytesToHuman(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let val = v;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function OrderAttachmentsPanel({ order }) {
  const { user } = useAuth();

  const canUpload = useMemo(
    () => ["admin", "supervisor", "production"].includes(user?.role),
    [user?.role]
  );

  const canDelete = useMemo(
    () => ["admin", "supervisor"].includes(user?.role),
    [user?.role]
  );

  const orderId = order?.id || order?._id;

  // Keep this surgical: only read takeoff items (no refactoring).
  const pieces = useMemo(() => {
    const items = order?.takeoff?.items || [];
    return (items || [])
      .map((x) => {
        const pieceUid = String(x.pieceUid || "");
        if (!pieceUid) return null;
        const label =
          x.pieceRef ||
          x.label ||
          x.name ||
          x.itemLabel ||
          `Piece ${pieceUid.slice(0, 8)}`;
        return { pieceUid, label };
      })
      .filter(Boolean);
  }, [order]);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [orderItems, setOrderItems] = useState([]);
  const [pieceUid, setPieceUid] = useState(pieces?.[0]?.pieceUid || "");
  const [pieceItems, setPieceItems] = useState([]);

  const [target, setTarget] = useState("order"); // order | piece
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const fileRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);

  async function loadOrder() {
    if (!orderId) return;
    setErr("");
    setLoading(true);
    try {
      const list = await apiListOrderAttachments(orderId);
      setOrderItems(list);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadPiece(uid) {
    if (!orderId) return;
    if (!uid) {
      setPieceItems([]);
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const list = await apiListPieceAttachments(orderId, uid);
      setPieceItems(list);
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    // keep selection valid if pieces change
    if (!pieces.length) {
      setPieceUid("");
      setPieceItems([]);
      return;
    }
    if (!pieceUid) {
      setPieceUid(pieces[0].pieceUid);
      return;
    }
    const stillExists = pieces.some((p) => p.pieceUid === pieceUid);
    if (!stillExists) setPieceUid(pieces[0].pieceUid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces]);

  useEffect(() => {
    if (target !== "piece") return;
    if (!pieceUid) return;
    loadPiece(pieceUid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, pieceUid]);

  const columns = useMemo(
    () => [
      {
        field: "originalName",
        headerName: "File",
        flex: 1,
        minWidth: 260,
      },
      {
        field: "category",
        headerName: "Category",
        width: 150,
        valueFormatter: (v) => v || "—",
      },
      {
        field: "sizeBytes",
        headerName: "Size",
        width: 120,
        valueFormatter: (v) => bytesToHuman(v),
      },
      {
        field: "uploadedByRole",
        headerName: "Role",
        width: 120,
        valueFormatter: (v) => v || "—",
      },
      {
        field: "createdAt",
        headerName: "Uploaded",
        width: 190,
        valueFormatter: (v) => formatWhen(v),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: canDelete ? 220 : 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const { blob, filename } = await apiDownloadAttachmentBlob(
                      row.id
                    );
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename || row.originalName || "download";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    setErr(`${e.code}: ${e.message}`);
                  }
                }}
              >
                Download
              </Button>

              {canDelete ? (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={async () => {
                    if (!confirm("Delete this attachment?")) return;
                    try {
                      await apiDeleteAttachment(row.id);
                      await loadOrder();
                      if (target === "piece" && pieceUid)
                        await loadPiece(pieceUid);
                    } catch (e) {
                      setErr(`${e.code}: ${e.message}`);
                    }
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </Box>
          );
        },
      },
    ],
    [canDelete, pieceUid, target]
  );

  async function doUpload() {
    if (!pendingFile) return;
    if (!orderId) return;

    setErr("");
    setLoading(true);
    try {
      if (target === "order") {
        await apiUploadOrderAttachment(orderId, {
          file: pendingFile,
          category: category || "",
          tags: tags || "",
          notes: notes || "",
        });
        await loadOrder();
      } else {
        if (!pieceUid) {
          setErr("No piece selected.");
          return;
        }
        await apiUploadPieceAttachment(orderId, pieceUid, {
          file: pendingFile,
          category: category || "",
          tags: tags || "",
          notes: notes || "",
        });
        await loadPiece(pieceUid);
      }

      // reset
      setPendingFile(null);
      setCategory("");
      setTags("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setErr(`${e.code}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const activeRows = target === "order" ? orderItems : pieceItems;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Alert severity="info">
        Attachments are internal-only. They do not block production and are not
        visible to customers/portal. Piece files are linked using the stable{" "}
        <b>pieceUid</b>.
      </Alert>

      {err ? <Alert severity="error">{err}</Alert> : null}

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Upload
          </Typography>

          {!canUpload ? (
            <Alert severity="warning">
              Your role can view/download attachments, but cannot upload.
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Upload target
              </Typography>
              <Select
                fullWidth
                size="small"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <MenuItem value="order">Order</MenuItem>
                <MenuItem value="piece" disabled={!pieces.length}>
                  Piece
                </MenuItem>
              </Select>
            </Box>

            {target === "piece" ? (
              <Box sx={{ minWidth: 260 }}>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Piece
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={pieceUid}
                  onChange={(e) => setPieceUid(e.target.value)}
                  disabled={!pieces.length}
                >
                  {pieces.map((p) => (
                    <MenuItem key={p.pieceUid} value={p.pieceUid}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            ) : null}

            <Box sx={{ flex: 1, minWidth: 260 }}>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                File
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                  style={{ width: "100%" }}
                  disabled={!canUpload || loading}
                />
                {pendingFile ? (
                  <Chip size="small" label={bytesToHuman(pendingFile.size)} />
                ) : null}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="technical / photos / qc / admin"
              sx={{ minWidth: 240 }}
              disabled={!canUpload || loading}
            />
            <TextField
              size="small"
              label="Tags (optional)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma-separated"
              sx={{ minWidth: 240 }}
              disabled={!canUpload || loading}
            />
          </Box>

          <TextField
            size="small"
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            disabled={!canUpload || loading}
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={loadOrder} disabled={loading}>
              Refresh order files
            </Button>

            {target === "piece" ? (
              <Button
                variant="outlined"
                onClick={() => (pieceUid ? loadPiece(pieceUid) : null)}
                disabled={loading || !pieceUid}
              >
                Refresh piece files
              </Button>
            ) : null}

            <Button
              variant="contained"
              onClick={doUpload}
              disabled={
                !canUpload ||
                loading ||
                !pendingFile ||
                (target === "piece" && !pieceUid)
              }
            >
              Upload
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {target === "order" ? "Order attachments" : "Piece attachments"}
            </Typography>
            <Chip size="small" label={`${activeRows.length} file(s)`} />
            {target === "piece" && pieceUid ? (
              <Chip
                size="small"
                variant="outlined"
                label={`pieceUid: ${pieceUid.slice(0, 12)}…`}
              />
            ) : null}
          </Box>

          <Divider />

          <Box sx={{ height: 520 }}>
            <DataGrid
              rows={activeRows.map((x) => ({ ...x, id: x.id }))}
              columns={columns}
              loading={loading}
              rowSelection={false}
              disableRowSelectionOnClick
              getRowId={(r) => r.id}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
