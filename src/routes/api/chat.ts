import { createFileRoute } from "@tanstack/react-router";

// Mocked conversational intake. Walks the patient through a fixed clinical
// script and adapts lightly to what they said.
const SCRIPT_EN = [
  "How long have you had this problem?",
  "Does anything make it better or worse?",
  "Are you taking any medicines right now?",
  "Do you have any allergies or long-term illnesses like diabetes or blood pressure?",
  "Thank you. That is all I need for now.",
];

const SCRIPT_HI = [
  "यह समस्या आपको कब से है?",
  "किस चीज़ से यह बढ़ती या कम होती है?",
  "क्या आप इस समय कोई दवा ले रहे हैं?",
  "क्या आपको कोई एलर्जी या पुरानी बीमारी जैसे मधुमेह या रक्तचाप है?",
  "धन्यवाद। अभी के लिए इतना पर्याप्त है।",
];

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          turn?: number;
          lang?: "en" | "hi";
          text?: string;
        };
        const lang = body.lang === "hi" ? "hi" : "en";
        const script = lang === "hi" ? SCRIPT_HI : SCRIPT_EN;
        const turn = Math.max(0, Math.min(script.length - 1, body.turn ?? 0));
        await new Promise((r) => setTimeout(r, 600));
        return Response.json({
          reply: script[turn],
          done: turn >= script.length - 1,
        });
      },
    },
  },
});
