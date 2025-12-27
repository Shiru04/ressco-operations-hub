import React, { useEffect, useRef, useState } from "react";
import { TextField } from "@mui/material";
import { loadGooglePlaces } from "../../../lib/googlePlaces";

function parsePlace(place) {
  const comps = place.address_components || [];
  const get = (type) =>
    comps.find((c) => c.types.includes(type))?.long_name || "";

  const streetNumber = get("street_number");
  const route = get("route");
  const city = get("locality") || get("sublocality") || get("postal_town");
  const state =
    comps.find((c) => c.types.includes("administrative_area_level_1"))
      ?.short_name || "";
  const zip = get("postal_code");

  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  const formatted =
    place.formatted_address ||
    [line1, city, state, zip].filter(Boolean).join(", ");

  return {
    placeId: place.place_id || null,
    formatted,
    line1: line1 || "",
    city: city || "",
    state: state || "",
    zip: zip || "",
  };
}

export default function ShipToAddressAutocomplete({
  value,
  onChange,
  onSelectStructured,
}) {
  const inputRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadGooglePlaces()
      .then((ok) => {
        if (!mounted) return;
        setEnabled(!!ok);

        if (!ok) return;

        const ac = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ["address"],
            fields: ["place_id", "formatted_address", "address_components"],
          }
        );

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const parsed = parsePlace(place);
          onChange?.(parsed.formatted);
          onSelectStructured?.(parsed);
        });
      })
      .catch(() => setEnabled(false));

    return () => {
      mounted = false;
    };
  }, [onChange, onSelectStructured]);

  return (
    <TextField
      label={enabled ? "Ship To (Address search)" : "Ship To"}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      inputRef={inputRef}
      placeholder={enabled ? "Start typing address…" : "Enter address"}
      sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
    />
  );
}
