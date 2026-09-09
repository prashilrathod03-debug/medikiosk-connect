import { createFileRoute } from "@tanstack/react-router";

// Mocked OCR extraction with a realistic 2 second processing delay.
const SAMPLES = [
  {
    kind: "Complete Blood Count",
    summary: "CBC report. Mild anaemia noted; other indices within range.",
    labs: [
      { name: "Haemoglobin", value: "10.1", unit: "g/dL", range: "13.0 - 17.0", abnormal: true },
      { name: "WBC", value: "7.4", unit: "10^3/uL", range: "4.0 - 11.0", abnormal: false },
      { name: "Platelets", value: "2.1", unit: "lakh/uL", range: "1.5 - 4.1", abnormal: false },
    ],
  },
  {
    kind: "Lipid Profile",
    summary: "Lipid profile. Elevated LDL cholesterol and triglycerides.",
    labs: [
      { name: "Total Cholesterol", value: "236", unit: "mg/dL", range: "< 200", abnormal: true },
      { name: "LDL", value: "162", unit: "mg/dL", range: "< 100", abnormal: true },
      { name: "HDL", value: "44", unit: "mg/dL", range: "> 40", abnormal: false },
    ],
  },
  {
    kind: "Blood Sugar",
    summary: "Fasting and post-prandial glucose. Fasting value raised.",
    labs: [
      { name: "Fasting Glucose", value: "138", unit: "mg/dL", range: "70 - 100", abnormal: true },
      { name: "HbA1c", value: "6.9", unit: "%", range: "< 5.7", abnormal: true },
    ],
  },
  {
    kind: "Prescription",
    summary: "Prescription: Amlodipine 5mg once daily, Metformin 500mg twice daily.",
    labs: [],
  },
];

export const Route = createFileRoute("/api/ocr-extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { fileName?: string; index?: number };
        await new Promise((r) => setTimeout(r, 2000));
        const pick = SAMPLES[(body.index ?? 0) % SAMPLES.length];
        return Response.json({ fileName: body.fileName ?? "document", ...pick });
      },
    },
  },
});
