import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { getTakeoffIconUrl } from "./iconResolver";

export default function TakeoffTypePicker({ catalog, onSelect }) {
  const [q, setQ] = useState("");

  const types = useMemo(() => {
    const all = catalog?.types || [];
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((t) => {
      return (
        t.typeCode.toLowerCase().includes(s) || t.name.toLowerCase().includes(s)
      );
    });
  }, [catalog, q]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Select a piece/type
        </Typography>
        <TextField
          size="small"
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 220 }}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(6, 1fr)",
          },
          gap: 2,
        }}
      >
        {types.map((t) => (
          <Card key={t.typeCode} sx={{ overflow: "hidden" }}>
            <CardActionArea onClick={() => onSelect(t)}>
              <Box
                sx={{
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(255,255,255,0.04)",
                }}
              >
                {/* Use plain <img>. If file missing, user will see broken image; we can add fallback later. */}
                <img
                  src={getTakeoffIconUrl(t.typeCode)}
                  alt={t.typeCode}
                  style={{ maxWidth: "90%", maxHeight: "90%" }}
                />
              </Box>

              <CardContent sx={{ display: "grid", gap: 0.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Chip size="small" label={t.typeCode} />
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t.diagram || ""}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {t.name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Fields: {(t.fields || []).join(", ")}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
