import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type Summary, loadSessions, updateSummary } from "@/lib/kiosk";

export const Route = createFileRoute("/physician")({
  head: () => ({
    meta: [
      { title: "Physician Dashboard — MediKiosk OPD Summaries" },
      {
        name: "description",
        content:
          "Review, edit and approve AI-prepared patient intake summaries from the MediKiosk OPD self check-in.",
      },
      { property: "og:title", content: "Physician Dashboard — MediKiosk" },
      {
        property: "og:description",
        content: "Review and approve structured patient intake summaries before consultation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Physician,
});

const DEMO = { user: "doctor", pass: "demo123" };

// Shape returned by loadSessions() — a joined Supabase row
type SessionRow = {
  id: string;
  token_number?: number | null;
  patients: {
    name: string;
    age: number | null;
    gender: string | null;
    abha_id: string | null;
  } | null;
  documents: {
    id: string;
    file_url: string;
    ocr_raw_text: string;
    extracted_data: { kind?: string; labs?: any[] } | null;
  }[];
  summaries: {
    id: string;
    chief_complaint: string;
    duration: string;
    symptoms: string;
    history: string;
    medications: string;
    allergies: string;
    vitals_notes: string;
    abnormal_findings: string;
    suggested_department: string;
    urgency: Summary["urgency"];
    physician_notes: string;
    approved: boolean;
  }[];
  transcript: { id: string; role: "assistant" | "patient"; text: string; at: number }[];
};

function Physician() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    loadSessions()
      .then((s) => {
        const rows = (s ?? []) as unknown as SessionRow[];
        setSessions(rows);
        setActiveId(rows[0]?.id ?? null);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load patient sessions.");
      })
      .finally(() => setLoading(false));
  }, [authed]);

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Physician login</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Demo access — username <strong>doctor</strong>, password <strong>demo123</strong>
          </p>
          <div className="mt-6 space-y-4">
            <input
              className="min-h-16 w-full rounded-2xl border bg-card px-5 text-lg"
              placeholder="Username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <input
              type="password"
              className="min-h-16 w-full rounded-2xl border bg-card px-5 text-lg"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            {error && <p className="text-base font-semibold text-destructive">{error}</p>}
            <button
              onClick={() =>
                user === DEMO.user && pass === DEMO.pass
                  ? setAuthed(true)
                  : setError("Invalid demo credentials")
              }
              className="min-h-16 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground"
            >
              Sign in
            </button>
            <Link to="/" className="block text-center text-base font-semibold text-primary underline">
              Back to kiosk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const activeSummary = active?.summaries?.[0] ?? null;

  async function update(patch: Partial<Summary>) {
    if (!activeSummary) return;
    // optimistic UI update
    setSessions((all) =>
      all.map((s) =>
        s.id === activeId
          ? {
              ...s,
              summaries: s.summaries.map((sm, i) =>
                i === 0
                  ? {
                      ...sm,
                      ...(patch.chiefComplaint !== undefined && { chief_complaint: patch.chiefComplaint }),
                      ...(patch.duration !== undefined && { duration: patch.duration }),
                      ...(patch.symptoms !== undefined && { symptoms: patch.symptoms }),
                      ...(patch.history !== undefined && { history: patch.history }),
                      ...(patch.medications !== undefined && { medications: patch.medications }),
                      ...(patch.allergies !== undefined && { allergies: patch.allergies }),
                      ...(patch.vitalsNotes !== undefined && { vitals_notes: patch.vitalsNotes }),
                      ...(patch.abnormalFindings !== undefined && { abnormal_findings: patch.abnormalFindings }),
                      ...(patch.suggestedDepartment !== undefined && { suggested_department: patch.suggestedDepartment }),
                      ...(patch.urgency !== undefined && { urgency: patch.urgency }),
                      ...(patch.physicianNotes !== undefined && { physician_notes: patch.physicianNotes }),
                      ...(patch.approved !== undefined && { approved: patch.approved }),
                    }
                  : sm,
              ),
            }
          : s,
      ),
    );
    try {
      await updateSummary(activeSummary.id, patch);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <h1 className="text-xl font-bold">MediKiosk · Physician dashboard</h1>
          <Link to="/" className="rounded-xl border px-4 py-3 text-base font-semibold hover:bg-accent">
            Kiosk
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <h2 className="text-lg font-bold">Waiting patients ({sessions.length})</h2>
          {loading && (
            <p className="rounded-2xl bg-secondary p-4 text-base text-muted-foreground">Loading…</p>
          )}
          {!loading && sessions.length === 0 && (
            <p className="rounded-2xl bg-secondary p-4 text-base text-muted-foreground">
              No check-ins yet. Complete a kiosk session first.
            </p>
          )}
          {sessions.map((s) => {
            const sm = s.summaries?.[0];
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full rounded-2xl border p-4 text-left ${
                  s.id === activeId ? "border-primary bg-accent" : "bg-card"
                }`}
              >
                <p className="text-lg font-bold">{s.patients?.name || "Unnamed patient"}</p>
                <p className="text-sm text-muted-foreground">
                  {s.patients?.age ? `${s.patients.age} yrs · ` : ""}
                  {sm?.suggested_department || "Pending"}
                  {sm?.approved ? " · Approved" : ""}
                </p>
              </button>
            );
          })}
        </aside>

        <main>
          {!active && <p className="text-lg text-muted-foreground">Select a patient.</p>}
          {active && (
            <div className="space-y-6">
              <section className="rounded-3xl border bg-card p-6">
                <h3 className="text-2xl font-bold">{active.patients?.name}</h3>
                <p className="text-base text-muted-foreground">
                  {active.patients?.age} yrs · {active.patients?.gender}
                  {active.patients?.abha_id ? ` · ABHA ${active.patients.abha_id}` : ""}
                </p>
              </section>

              {activeSummary && (
                <section className="rounded-3xl border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">Structured summary</h3>
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        activeSummary.approved ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      {activeSummary.approved ? "Approved" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["chief_complaint", "chiefComplaint", "Chief complaint"],
                        ["duration", "duration", "Duration"],
                        ["symptoms", "symptoms", "Symptoms"],
                        ["history", "history", "History"],
                        ["medications", "medications", "Medications"],
                        ["allergies", "allergies", "Allergies"],
                        ["abnormal_findings", "abnormalFindings", "Abnormal findings"],
                        ["vitals_notes", "vitalsNotes", "Vitals notes"],
                      ] as const
                    ).map(([dbKey, summaryKey, label]) => (
                      <label key={dbKey} className="block">
                        <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                          {label}
                        </span>
                        <textarea
                          className="min-h-20 w-full rounded-2xl border bg-card p-4 text-base"
                          value={(activeSummary as any)[dbKey] ?? ""}
                          onChange={(e) => update({ [summaryKey]: e.target.value } as Partial<Summary>)}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                        Department
                      </span>
                      <select
                        className="min-h-16 w-full rounded-2xl border bg-card px-4 text-base"
                        value={activeSummary.suggested_department}
                        onChange={(e) => update({ suggestedDepartment: e.target.value })}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                        Urgency
                      </span>
                      <select
                        className="min-h-16 w-full rounded-2xl border bg-card px-4 text-base"
                        value={activeSummary.urgency}
                        onChange={(e) => update({ urgency: e.target.value as Summary["urgency"] })}
                      >
                        {["Routine", "Priority", "Urgent"].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                        Physician notes
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-2xl border bg-card p-4 text-base"
                        value={activeSummary.physician_notes ?? ""}
                        onChange={(e) => update({ physicianNotes: e.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => update({ approved: !activeSummary.approved })}
                    className="mt-6 min-h-16 w-full rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground sm:w-auto"
                  >
                    {activeSummary.approved ? "Withdraw approval" : "Approve summary"}
                  </button>
                </section>
              )}

              {active.documents?.length > 0 && (
                <section className="rounded-3xl border bg-card p-6">
                  <h3 className="text-xl font-bold">Documents</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {active.documents.map((d) => (
                      <div key={d.id} className="rounded-2xl bg-secondary p-4">
                        <p className="font-bold">{d.extracted_data?.kind || d.file_url}</p>
                        <p className="mt-1 text-base">{d.ocr_raw_text}</p>
                        {(d.extracted_data?.labs ?? [])
                          .filter((l: any) => l.abnormal)
                          .map((l: any) => (
                            <p key={l.name} className="mt-2 font-bold text-destructive">
                              {l.name}: {l.value} {l.unit} (ref {l.range})
                            </p>
                          ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-3xl border bg-card p-6">
                <h3 className="text-xl font-bold">Intake transcript</h3>
                <div className="mt-4 space-y-3">
                  {(active.transcript ?? []).map((m) => (
                    <p key={m.id} className="text-base">
                      <span className="font-bold">{m.role === "patient" ? "Patient" : "Kiosk"}:</span>{" "}
                      {m.text}
                    </p>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
