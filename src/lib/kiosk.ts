import { supabase } from "./supabase";

// Real UUID generator — replaces the old uid() which produced non-UUID strings
export const uid = () => crypto.randomUUID();

// ---- PATIENT ----
export async function createPatient(patient: Omit<Patient, "id">): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      name: patient.name,
      age: patient.age ? parseInt(patient.age) : null,
      gender: patient.gender,
      abha_id: patient.abhaId || null,
      preferred_language: patient.lang,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    age: String(data.age ?? ""),
    gender: data.gender ?? "",
    phone: patient.phone, // not in patients table yet — see note below
    abhaId: data.abha_id ?? undefined,
    consent: patient.consent,
    lang: data.preferred_language as Lang,
  };
}

// ---- SESSION ----
export async function createSession(patientId: string): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ patient_id: patientId, status: "in_progress" })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveMessage(sessionId: string, message: ChatMessage) {
  // Append to the transcript jsonb array
  const { data: existing, error: fetchError } = await supabase
    .from("sessions")
    .select("transcript")
    .eq("id", sessionId)
    .single();

  if (fetchError) throw fetchError;

  const transcript = [...(existing.transcript ?? []), message];

  const { error } = await supabase
    .from("sessions")
    .update({ transcript, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, patients(*), documents(*), summaries(*)")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function loadSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, patients(*), documents(*), summaries(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

// ---- DOCUMENT ----
export async function saveDocument(sessionId: string, doc: Omit<KioskDocument, "id">) {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      session_id: sessionId,
      file_name: doc.fileName,
      ocr_raw_text: doc.summary,
      extracted_data: { labs: doc.labs, kind: doc.kind },
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

// ---- SUMMARY ----
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

  await supabase
    .from("sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
}
