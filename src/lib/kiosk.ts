// Shared types, i18n strings and Supabase-backed persistence for MediKiosk.

import { supabase } from "./supabase";

export type Lang = "en" | "hi";

export type Patient = {
  id: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  abhaId?: string | undefined;
  consent: boolean;
  lang: Lang;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "patient";
  text: string;
  at: number;
};

export type LabValue = {
  name: string;
  value: string;
  unit: string;
  range: string;
  abnormal: boolean;
};

export type KioskDocument = {
  id: string;
  fileName: string;
  kind: string;
  previewUrl?: string | undefined;
  status: "processing" | "done";
  summary: string;
  labs: LabValue[];
};

export type Summary = {
  chiefComplaint: string;
  duration: string;
  symptoms: string;
  history: string;
  medications: string;
  allergies: string;
  vitalsNotes: string;
  abnormalFindings: string;
  suggestedDepartment: string;
  urgency: "Routine" | "Priority" | "Urgent";
  physicianNotes: string;
  approved: boolean;
};

export type Session = {
  id: string;
  createdAt: number;
  patient: Patient;
  messages: ChatMessage[];
  documents: KioskDocument[];
  summary?: Summary | undefined;
  tokenNumber?: number | undefined;
};

export const uid = () => crypto.randomUUID();

export const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Orthopaedics",
  "ENT",
  "Dermatology",
  "Paediatrics",
  "Gynaecology",
];

type Dict = Record<string, { en: string; hi: string }>;

export const T: Dict = {
  brand: { en: "MediKiosk", hi: "मेडीकिओस्क" },
  tagline: {
    en: "Hospital OPD self check-in",
    hi: "अस्पताल ओपीडी स्वयं पंजीकरण",
  },
  chooseLang: { en: "Choose your language", hi: "अपनी भाषा चुनें" },
  start: { en: "Start check-in", hi: "पंजीकरण शुरू करें" },
  physician: { en: "Physician login", hi: "चिकित्सक लॉगिन" },
  step: { en: "Step", hi: "चरण" },
  of: { en: "of", hi: "में से" },
  identify: { en: "Your details", hi: "आपका विवरण" },
  name: { en: "Full name", hi: "पूरा नाम" },
  age: { en: "Age", hi: "आयु" },
  gender: { en: "Gender", hi: "लिंग" },
  male: { en: "Male", hi: "पुरुष" },
  female: { en: "Female", hi: "महिला" },
  other: { en: "Other", hi: "अन्य" },
  phone: { en: "Mobile number", hi: "मोबाइल नंबर" },
  abha: { en: "ABHA / Health ID (optional)", hi: "आभा / हेल्थ आईडी (वैकल्पिक)" },
  consentTitle: { en: "Consent", hi: "सहमति" },
  consentText: {
    en: "I agree that my answers and documents may be used to prepare a summary for my doctor.",
    hi: "मैं सहमत हूँ कि मेरे उत्तर और दस्तावेज़ मेरे डॉक्टर के लिए सारांश बनाने हेतु उपयोग किए जा सकते हैं।",
  },
  continue: { en: "Continue", hi: "आगे बढ़ें" },
  back: { en: "Back", hi: "पीछे" },
  intake: { en: "Tell us your problem", hi: "अपनी समस्या बताएं" },
  speak: { en: "Tap to speak", hi: "बोलने के लिए दबाएं" },
  listening: { en: "Listening…", hi: "सुन रहे हैं…" },
  typeHere: { en: "Type your answer", hi: "अपना उत्तर लिखें" },
  send: { en: "Send", hi: "भेजें" },
  docs: { en: "Upload reports", hi: "रिपोर्ट अपलोड करें" },
  dropHere: {
    en: "Drag & drop, or choose a file / use camera",
    hi: "यहाँ खींचें, या फ़ाइल चुनें / कैमरा उपयोग करें",
  },
  chooseFile: { en: "Choose file", hi: "फ़ाइल चुनें" },
  camera: { en: "Camera", hi: "कैमरा" },
  processing: { en: "Reading document…", hi: "दस्तावेज़ पढ़ा जा रहा है…" },
  abnormal: { en: "Abnormal", hi: "असामान्य" },
  skip: { en: "Skip", hi: "छोड़ें" },
  finish: { en: "Finish & get token", hi: "समाप्त करें और टोकन लें" },
  summary: { en: "Your visit summary", hi: "आपकी विज़िट का सारांश" },
  token: { en: "Token number", hi: "टोकन नंबर" },
  goTo: { en: "Please proceed to", hi: "कृपया जाएँ" },
  newPatient: { en: "New patient", hi: "नया मरीज़" },
  required: {
    en: "Please fill name, age and phone, and accept consent.",
    hi: "कृपया नाम, आयु, फ़ोन भरें और सहमति दें।",
  },
};

export const t = (k: keyof typeof T | string, lang: Lang) =>
  (T[k] ? T[k][lang] : k) as string;

// ---------------------------------------------------------------------------
// Supabase-backed persistence
// ---------------------------------------------------------------------------

export async function createPatient(patient: Omit<Patient, "id">): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      name: patient.name,
      age: patient.age ? parseInt(patient.age, 10) : null,
      gender: patient.gender,
      abha_id: patient.abhaId || null,
      preferred_language: patient.lang,
    })
    .select()
    .single();

  if (error) throw error;

  return { ...patient, id: data.id };
}

export async function createSession(patientId: string): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ patient_id: patientId, status: "in_progress" })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSession(
  sessionId: string,
  fields: {
    transcript?: ChatMessage[];
    status?: string;
    chief_complaint?: string;
    red_flag?: boolean;
  },
) {
  const { error } = await supabase
    .from("sessions")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function saveDocument(sessionId: string, doc: KioskDocument) {
  const { error } = await supabase.from("documents").insert({
    session_id: sessionId,
    file_url: doc.fileName,
    ocr_raw_text: doc.summary,
    extracted_data: { kind: doc.kind, labs: doc.labs },
  });

  if (error) throw error;
}

export async function saveSummary(sessionId: string, summary: Summary) {
  const { error } = await supabase.from("summaries").insert({
    session_id: sessionId,
    chief_complaint: summary.chiefComplaint,
    hpi: summary.symptoms,
    past_history: summary.history,
    drug_allergy_history: summary.allergies,
    investigations_summary: summary.abnormalFindings,
    physician_approved: summary.approved,
  });

  if (error) throw error;

  await updateSession(sessionId, { status: "completed" });
}

export async function approveSummary(summaryId: string, physicianNotes?: string) {
  const { error } = await supabase
    .from("summaries")
    .update({ physician_approved: true })
    .eq("id", summaryId);

  if (error) throw error;
}

// Returns raw Supabase rows: each session comes with nested patients (object),
// documents (array), and summaries (array) via the foreign-key joins.
export async function loadSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, patients(*), documents(*), summaries(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}
