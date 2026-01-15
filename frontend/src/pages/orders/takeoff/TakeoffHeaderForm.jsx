import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { fromISOToLADayjs, toLADateISO } from "../../../lib/dayjs";
import ShipToAddressAutocomplete from "./ShipToAddressAutocomplete";

export default function TakeoffHeaderForm({ value, onChange }) {
  const h = value || {};

  function patch(p) {
    onChange({ ...h, ...p });
  }

  return (
    <Card>
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Takeoff
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Customer"
            value={h.customer || ""}
            onChange={(e) => patch({ customer: e.target.value })}
          />
          <TextField
            label="Job Name"
            value={h.jobName || ""}
            onChange={(e) => patch({ jobName: e.target.value })}
          />

          <TextField
            label="Buyer"
            value={h.buyer || ""}
            onChange={(e) => patch({ buyer: e.target.value })}
          />

          <DatePicker
            label="Date"
            value={fromISOToLADayjs(h.date)}
            onChange={(val) => patch({ date: val ? toLADateISO(val) : null })}
            slotProps={{ textField: { fullWidth: true } }}
          />

          {/* Ship To now uses address finder */}
          <ShipToAddressAutocomplete
            value={h.shipTo || ""}
            onChange={(formatted) => patch({ shipTo: formatted })}
            onSelectStructured={(addr) =>
              patch({ shipTo: addr.formatted, shipToAddress: addr })
            }
          />

          <TextField
            label="PO#"
            value={h.poNumber || ""}
            onChange={(e) => patch({ poNumber: e.target.value })}
          />

          <DatePicker
            label="Due Date"
            value={fromISOToLADayjs(h.dueDate)}
            onChange={(val) =>
              patch({ dueDate: val ? toLADateISO(val) : null })
            }
            slotProps={{ textField: { fullWidth: true } }}
          />

          <TextField
            label="Job Contact Phone"
            value={h.jobContactPhone || ""}
            onChange={(e) => patch({ jobContactPhone: e.target.value })}
          />
          <TextField
            select
            label="Code"
            value={h.code || ""}
            onChange={(e) => patch({ code: e.target.value || null })}
            fullWidth
          >
            <MenuItem value="SMACNA">SMACNA</MenuItem>
            <MenuItem value="UMC">UMC</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
          <TextField
            label="Pressure Class"
            value={h.pressureClass || ""}
            onChange={(e) => patch({ pressureClass: e.target.value })}
          />

          <TextField
            label="Insulation"
            value={h.insulation || ""}
            onChange={(e) => patch({ insulation: e.target.value })}
          />
          <TextField
            label="Brand"
            value={h.brand || ""}
            onChange={(e) => patch({ brand: e.target.value })}
          />

          <TextField
            label="R-Value"
            value={h.rValue || ""}
            onChange={(e) => patch({ rValue: e.target.value })}
          />
          <TextField
            label="Material Type"
            value={h.materialType || ""}
            onChange={(e) => patch({ materialType: e.target.value })}
          />

          <TextField
            label="End Connectors"
            value={h.endConnectors || ""}
            onChange={(e) => patch({ endConnectors: e.target.value })}
          />
          <TextField
            label="Sealant"
            value={h.sealant || ""}
            onChange={(e) => patch({ sealant: e.target.value })}
          />

          <TextField
            label="Stiffening"
            value={h.stiffening || ""}
            onChange={(e) => patch({ stiffening: e.target.value })}
          />
          <TextField
            label="Exterior Angle Iron"
            value={h.exteriorAngleIron || ""}
            onChange={(e) => patch({ exteriorAngleIron: e.target.value })}
          />
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h.exposed}
                onChange={(e) => patch({ exposed: e.target.checked })}
              />
            }
            label="Exposed"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h.label}
                onChange={(e) => patch({ label: e.target.checked })}
              />
            }
            label="Label"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h?.duct?.assembled}
                onChange={(e) =>
                  patch({
                    duct: { ...(h.duct || {}), assembled: e.target.checked },
                  })
                }
              />
            }
            label="Duct: Assembled"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h?.duct?.pitts}
                onChange={(e) =>
                  patch({
                    duct: { ...(h.duct || {}), pitts: e.target.checked },
                  })
                }
              />
            }
            label="Duct: Pitts"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h?.duct?.snapLock}
                onChange={(e) =>
                  patch({
                    duct: { ...(h.duct || {}), snapLock: e.target.checked },
                  })
                }
              />
            }
            label="Duct: Snap Lock"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h?.duct?.bead}
                onChange={(e) =>
                  patch({ duct: { ...(h.duct || {}), bead: e.target.checked } })
                }
              />
            }
            label="Duct: Bead"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!h?.duct?.crossBreak}
                onChange={(e) =>
                  patch({
                    duct: { ...(h.duct || {}), crossBreak: e.target.checked },
                  })
                }
              />
            }
            label="Duct: Cross Break"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
