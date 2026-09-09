import { createFileRoute } from "@tanstack/react-router";

type Body = {
  answers?: string[];
  labs?: { name: string; value: string; unit: string; abnormal: boolean }[];
  age?: string;
};

const ROUTES: { keys: string[]; dept: string }[] = [
  { keys: ["chest", "heart", "palpit", "सीना", "दिल"], dept: "Cardiology" },
  { keys: ["knee", "back", "joint", "bone", "घुटन", "कमर", "हड्डी"], dept: "Orthopaedics" },
  { keys: ["ear", "throat", "nose", "कान", "गला", "नाक"], dept: "ENT" },
  { keys: ["skin", "rash", "itch", "त्वचा", "खुजली"], dept: "Dermatology" },
];

export const Route = createFileRoute("/api/generate-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const answers = body.answers ?? [];
        const blob = answers.join(" ").toLowerCase();
        await new Promise((r) => setTimeout(r, 1500));

        const dept =
          ROUTES.find((r) => r.keys.some((k) => blob.includes(k)))?.dept ?? "General Medicine";
        const abnormal = (body.labs ?? []).filter((l) => l.abnormal);
        const urgency =
          blob.includes("severe") || blob.includes("chest") || abnormal.length > 2
            ? "Priority"
            : "Routine";

        return Response.json({
          chiefComplaint: answers[0] ?? "Not stated",
          duration: answers[1] ?? "Not stated",
          symptoms: answers.slice(0, 2).join("; ") || "Not stated",
          history: answers[4] ?? "No significant history reported",
          medications: answers[3] ?? "None reported",
          allergies: answers[4] ?? "None reported",
          vitalsNotes: "Vitals not recorded at kiosk",
          abnormalFindings: abnormal.length
            ? abnormal.map((l) => `${l.name} ${l.value} ${l.unit}`).join(", ")
            : "No abnormal lab values detected",
          suggestedDepartment: dept,
          urgency,
          tokenNumber: 100 + Math.floor(Math.random() * 90),
        });
      },
    },
  },
});
