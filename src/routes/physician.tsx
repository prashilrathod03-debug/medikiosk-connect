import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type Session, type Summary, loadSessions, saveSession } from "@/lib/kiosk";

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

  function update(patch: Partial<Summary>) {
    if (!active?.summary) return;
    const updated: Session = { ...active, summary: { ...active.summary, ...patch } };
    saveSession(updated);
    setSessions((all) => all.map((s) => (s.id === updated.id ? updated : s)));
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
          {sessions.length === 0 && (
            <p className="rounded-2xl bg-secondary p-4 text-base text-muted-foreground">
              No check-ins yet. Complete a kiosk session first.
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`w-full rounded-2xl border p-4 text-left ${
                s.id === activeId ? "border-primary bg-accent" : "bg-card"
              }`}
            >
              <p className="text-lg font-bold">{s.patient.name || "Unnamed patient"}</p>
              <p className="text-sm text-muted-foreground">
                {s.patient.age ? `${s.patient.age} yrs · ` : ""}
                {s.summary?.suggestedDepartment ?? "Pending"}
                {s.summary?.approved ? " · Approved" : ""}
              </p>
            </button>
          ))}
        </aside>

        <main>
          {!active && <p className="text-lg text-muted-foreground">Select a patient.</p>}
          {active && (
            <div className="space-y-6">
              <section className="rounded-3xl border bg-card p-6">
                <h3 className="text-2xl font-bold">{active.patient.name}</h3>
                <p className="text-base text-muted-foreground">
                  {active.patient.age} yrs · {active.patient.gender} · {active.patient.phone}
                  {active.patient.abhaId ? ` · ABHA ${active.patient.abhaId}` : ""}
                </p>
                {active.tokenNumber && (
                  <p className="mt-2 text-base font-semibold">Token #{active.tokenNumber}</p>
                )}
              </section>

              {active.summary && (
                <section className="rounded-3xl border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">Structured summary</h3>
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        active.summary.approved
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      }`}
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
                        <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                          {label}
                        </span>
                        <textarea
                          className="min-h-20 w-full rounded-2xl border bg-card p-4 text-base"
                          value={active.summary![key]}
                          onChange={(e) => update({ [key]: e.target.value } as Partial<Summary>)}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold uppercase text-muted-foreground">
                        Department
                      </span>
                      <select
                        className="min-h-16 w-full rounded-2xl border bg-card px-4 text-base"
                        value={active.summary.suggestedDepartment}
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
                        value={active.summary.urgency}
                        onChange={(e) =>
                          update({ urgency: e.target.value as Summary["urgency"] })
                        }
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
                        value={active.summary.physicianNotes}
                        onChange={(e) => update({ physicianNotes: e.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => update({ approved: !active.summary!.approved })}
                    className="mt-6 min-h-16 w-full rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground sm:w-auto"
                  >
                    {active.summary.approved ? "Withdraw approval" : "Approve summary"}
                  </button>
                </section>
              )}

              {active.documents.length > 0 && (
                <section className="rounded-3xl border bg-card p-6">
                  <h3 className="text-xl font-bold">Documents</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {active.documents.map((d) => (
                      <div key={d.id} className="rounded-2xl bg-secondary p-4">
                        <p className="font-bold">{d.kind || d.fileName}</p>
                        <p className="mt-1 text-base">{d.summary}</p>
                        {d.labs
                          .filter((l) => l.abnormal)
                          .map((l) => (
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
                  {active.messages.map((m) => (
                    <p key={m.id} className="text-base">
                      <span className="font-bold">
                        {m.role === "patient" ? "Patient" : "Kiosk"}:
                      </span>{" "}
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
