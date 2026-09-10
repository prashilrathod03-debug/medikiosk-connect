import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type Session, type Summary, loadSessions, saveSession } from "@/lib/kiosk";

export const Route = createFileRoute("/physician")({
  head: () => ({
    meta: [
      { title: "Physician Dashboard — MediKiosk OPD Summaries" },
      {
        name: "description",
        content: "Review, edit and approve AI-prepared patient intake summaries from the MediKiosk OPD self check-in.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@500;700&family=Inter:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  component: Physician,
});

const DEMO = { user: "doctor", pass: "demo123" };
const serif = { fontFamily: "'Noto Serif Devanagari', serif" };

function Physician() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (authed) {
      const s = loadSessions();
      setSessions(s);
      setActiveId(s[0]?.id ?? null);
    }
  }, [authed]);

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center px-5" style={{ background: "#F7F1E4" }}>
        <div className="w-full max-w-md rounded-[2rem] border p-8" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
          <h1 className="text-3xl font-bold" style={serif}>
            Physician login
          </h1>
          <p className="mt-2 text-base" style={{ color: "#6B5F4A" }}>
            Demo access — username <strong>doctor</strong>, password <strong>demo123</strong>
          </p>
          <div className="mt-6 space-y-4">
            <input
              className="min-h-16 w-full rounded-2xl px-5 text-lg"
              style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
              placeholder="Username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <input
              type="password"
              className="min-h-16 w-full rounded-2xl px-5 text-lg"
              style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            {error && (
              <p className="text-base font-semibold" style={{ color: "#B8452E" }}>
                {error}
              </p>
            )}
            <button
              onClick={() => (user === DEMO.user && pass === DEMO.pass ? setAuthed(true) : setError("Invalid demo credentials"))}
              className="min-h-16 w-full rounded-full text-lg font-bold"
              style={{ background: "#D9821B", color: "#FFFDF7" }}
            >
              Sign in
            </button>
            <Link to="/" className="block text-center text-base font-semibold underline" style={{ color: "#0E5C4F" }}>
              Back to kiosk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const active = sessions.find((s) => s.id === activeId) ?? null;

  function update(patch: Partial<Summary>) {
    if (!active?.summary) return;
    const updated: Session = { ...active, summary: { ...active.summary, ...patch } };
    saveSession(updated);
    setSessions((all) => all.map((s) => (s.id === updated.id ? updated : s)));
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F1E4" }}>
      <header className="border-b" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <h1 className="text-xl font-bold" style={serif}>
            MediKiosk · Physician dashboard
          </h1>
          <Link to="/" className="rounded-full border-2 px-4 py-3 text-base font-semibold" style={{ borderColor: "#0E5C4F", color: "#0E5C4F" }}>
            Kiosk
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <h2 className="text-lg font-bold">Waiting patients ({sessions.length})</h2>
          {sessions.length === 0 && (
            <p className="rounded-2xl p-4 text-base" style={{ background: "#EDE2CC", color: "#6B5F4A" }}>
              No check-ins yet. Complete a kiosk session first.
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="w-full rounded-2xl border-2 p-4 text-left"
              style={s.id === activeId ? { borderColor: "#D9821B", background: "#F3E4C8" } : { borderColor: "#E5D8B8", background: "#FFFDF7" }}
            >
              <p className="text-lg font-bold">{s.patient.name || "Unnamed patient"}</p>
              <p className="text-sm" style={{ color: "#8A7B5C" }}>
                {s.patient.age ? `${s.patient.age} yrs · ` : ""}
                {s.summary?.suggestedDepartment ?? "Pending"}
                {s.summary?.approved ? " · Approved" : ""}
              </p>
            </button>
          ))}
        </aside>

        <main>
          {!active && (
            <p className="text-lg" style={{ color: "#8A7B5C" }}>
              Select a patient.
            </p>
          )}
          {active && (
            <div className="space-y-6">
              <section className="rounded-[2rem] border p-6" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
                <h3 className="text-2xl font-bold" style={serif}>
                  {active.patient.name}
                </h3>
                <p className="text-base" style={{ color: "#6B5F4A" }}>
                  {active.patient.age} yrs · {active.patient.gender} · {active.patient.phone}
                  {active.patient.abhaId ? ` · ABHA ${active.patient.abhaId}` : ""}
                </p>
                {active.tokenNumber && <p className="mt-2 text-base font-semibold">Token #{active.tokenNumber}</p>}
              </section>

              {active.summary && (
                <section className="rounded-[2rem] border p-6" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold" style={serif}>
                      Structured summary
                    </h3>
                    <span
                      className="rounded-full px-4 py-2 text-sm font-bold"
                      style={active.summary.approved ? { background: "#0E5C4F", color: "#FFFDF7" } : { background: "#EDE2CC", color: "#6B5F4A" }}
                    >
                      {active.summary.approved ? "Approved" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["chiefComplaint", "Chief complaint"],
                        ["duration", "Duration"],
                        ["symptoms", "Symptoms"],
                        ["history", "History"],
                        ["medications", "Medications"],
                        ["allergies", "Allergies"],
                        ["abnormalFindings", "Abnormal findings"],
                        ["vitalsNotes", "Vitals notes"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="mb-1 block text-sm font-semibold uppercase" style={{ color: "#8A7B5C" }}>
                          {label}
                        </span>
                        <textarea
                          className="min-h-20 w-full rounded-2xl p-4 text-base"
                          style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
                          value={active.summary![key]}
                          onChange={(e) => update({ [key]: e.target.value } as Partial<Summary>)}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold uppercase" style={{ color: "#8A7B5C" }}>
                        Department
                      </span>
                      <select
                        className="min-h-16 w-full rounded-2xl px-4 text-base"
                        style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
                        value={active.summary.suggestedDepartment}
                        onChange={(e) => update({ suggestedDepartment: e.target.value })}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold uppercase" style={{ color: "#8A7B5C" }}>
                        Urgency
                      </span>
                      <select
                        className="min-h-16 w-full rounded-2xl px-4 text-base"
                        style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
                        value={active.summary.urgency}
                        onChange={(e) => update({ urgency: e.target.value as Summary["urgency"] })}
                      >
                        {["Routine", "Priority", "Urgent"].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-sm font-semibold uppercase" style={{ color: "#8A7B5C" }}>
                        Physician notes
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-2xl p-4 text-base"
                        style={{ background: "#FFFDF7", border: "2px solid #E5D8B8" }}
                        value={active.summary.physicianNotes}
                        onChange={(e) => update({ physicianNotes: e.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => update({ approved: !active.summary!.approved })}
                    className="mt-6 min-h-16 w-full rounded-full px-8 text-lg font-bold sm:w-auto"
                    style={{ background: "#D9821B", color: "#FFFDF7" }}
                  >
                    {active.summary.approved ? "Withdraw approval" : "Approve summary"}
                  </button>
                </section>
              )}

              {active.documents.length > 0 && (
                <section className="rounded-[2rem] border p-6" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
                  <h3 className="text-xl font-bold" style={serif}>
                    Documents
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {active.documents.map((d) => (
                      <div key={d.id} className="rounded-2xl p-4" style={{ background: "#EDE2CC" }}>
                        <p className="font-bold">{d.kind || d.fileName}</p>
                        <p className="mt-1 text-base">{d.summary}</p>
                        {d.labs
                          .filter((l) => l.abnormal)
                          .map((l) => (
                            <p key={l.name} className="mt-2 font-bold" style={{ color: "#B8452E" }}>
                              {l.name}: {l.value} {l.unit} (ref {l.range})
                            </p>
                          ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-[2rem] border p-6" style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}>
                <h3 className="text-xl font-bold" style={serif}>
                  Intake transcript
                </h3>
                <div className="mt-4 space-y-3">
                  {active.messages.map((m) => (
                    <p key={m.id} className="text-base">
                      <span className="font-bold">{m.role === "patient" ? "Patient" : "Kiosk"}:</span> {m.text}
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
