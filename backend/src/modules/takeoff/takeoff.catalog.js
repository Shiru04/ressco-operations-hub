// Practical subset to start; extensible. References match diagram sheet (page 2).
// Measurement keys align to grid columns (page 1): W1,D1,W2,D2,W3,D3,L,S1..S4,O1,O2,TD1,TD2,T,TJ,A,R1,R2,TV,M
const TAKEOFF_FIELDS = [
  "W1",
  "D1",
  "W2",
  "D2",
  "W3",
  "D3",
  "L",
  "S1",
  "S2",
  "S3",
  "S4",
  "O1",
  "O2",
  "TD1",
  "TD2",
  "T",
  "TJ",
  "A",
  "R1",
  "R2",
  "TV",
  "M",
];

const CATALOG = [
  {
    typeCode: "D-1",
    name: 'Straight Duct (L=80")',
    diagram: "D-1",
    fields: ["W1", "D1", "L"],
  },
  {
    typeCode: "D-2",
    name: "Straight Duct (L variable)",
    diagram: "D-2",
    fields: ["W1", "D1", "L"],
  },

  {
    typeCode: "F-1",
    name: "Elbow (TV/S)",
    diagram: "F-1",
    fields: ["W1", "D1", "W2", "D2", "S1", "S2", "TV", "M"],
  },
  {
    typeCode: "F-2",
    name: "Elbow (TV/M)",
    diagram: "F-2",
    fields: ["W1", "D1", "W2", "D2", "S1", "S2", "TV", "M"],
  },
  {
    typeCode: "F-3",
    name: "Angular Elbow (W2, A)",
    diagram: "F-3",
    fields: ["W1", "D1", "W2", "S1", "S2", "A"],
  },
  {
    typeCode: "F-4",
    name: "Radius Elbow (A)",
    diagram: "F-4",
    fields: ["W1", "D1", "W2", "D2", "S1", "S2", "A"],
  },
  {
    typeCode: "F-6",
    name: "Radius Elbow (TD1)",
    diagram: "F-6",
    fields: ["W1", "D1", "W2", "D2", "S1", "S2", "TD1", "A"],
  },
  {
    typeCode: "F-7",
    name: "Radius Elbow (TD)",
    diagram: "F-7",
    fields: ["W1", "D1", "W2", "D2", "S1", "S2", "TD1", "A"],
  },

  {
    typeCode: "F-8",
    name: "Transition (W3)",
    diagram: "F-8",
    fields: ["W1", "D1", "W3", "S1", "S2", "S3", "TV"],
  },
  {
    typeCode: "F-10",
    name: "Transition (TD1)",
    diagram: "F-10",
    fields: ["W1", "D1", "W2", "D2", "L", "TD1", "T"],
  },

  {
    typeCode: "F-11",
    name: "Offset Transition",
    diagram: "F-11",
    fields: ["W1", "D1", "W2", "D2", "L", "TD1", "S1", "S2"],
  },
  {
    typeCode: "F-12",
    name: "Offset Transition (O)",
    diagram: "F-12",
    fields: ["W1", "D1", "W2", "D2", "L", "TD1", "O1", "S1", "S2"],
  },
  {
    typeCode: "F-13",
    name: "Offset Transition (O)",
    diagram: "F-13",
    fields: ["W1", "D1", "W2", "D2", "L", "TD1", "O1", "S1", "S2"],
  },

  {
    typeCode: "F-17",
    name: "Tap-In (angled)",
    diagram: "F-17",
    fields: ["W1", "D1", "L", "S1", "A"],
  },
  {
    typeCode: "F-18",
    name: "Tap-In (straight)",
    diagram: "F-18",
    fields: ["W1", "D1", "L", "A"],
  },

  {
    typeCode: "F-20",
    name: "Cap/End (push on)",
    diagram: "F-20",
    fields: ["W1", "D1", "L", "TD1"],
  },
  {
    typeCode: "F-21",
    name: "Connector (push on)",
    diagram: "F-21",
    fields: ["W1", "D1"],
  },
];

function getTakeoffCatalog() {
  return {
    version: 1,
    fields: TAKEOFF_FIELDS,
    types: CATALOG,
  };
}

module.exports = { getTakeoffCatalog };
