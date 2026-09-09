import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  DEPARTMENTS,
  type ChatMessage,
  type KioskDocument,
  type Lang,
  type Patient,
  type Session,
  type Summary,
  saveSession,
  t,
  uid,
} from "@/lib/kiosk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediKiosk — Patient Self Check-In for Hospital OPD" },
      {
        name: "description",
        content:
          "Bilingual self-service kiosk for hospital OPD: register, describe symptoms by voice or touch, upload reports and get your token.",
      },
      { property: "og:title", content: "MediKiosk — Patient Self Check-In" },
      {
        property: "og:description",
        content:
          "Register, talk through your symptoms in English or Hindi, upload reports and receive your OPD token.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kiosk,
});

const STEPS = 5;

function Kiosk() {
  const [lang, setLang] = useState<Lang>("en");
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<Patient>({
    id: uid(),
    name: "",
    age: "",
    gender: "",
    phone: "",
    abhaId: "",
    consent: false,
    lang: "en",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<KioskDocument[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [token, setToken] = useState<number | null>(null);
  const sessionId = useRef(uid());

  const tr = (k: string) => t(k, lang);

  function persist(extra: Partial<Session> = {}) {
    const session: Session = {
      id: sessionId.current,
      createdAt: Date.now(),
      patient: { ...patient, lang },
      messages,
      documents,
      summary: summary ?? undefined,
      tokenNumber: token ?? undefined,
      ...extra,
    };
    saveSession(session);
  }

  useEffect(() => {
    if (step > 0) persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, documents, summary, token, step]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-2xl text-primary-foreground">
              ✚
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">{tr("brand")}</p>
              <p className="text-sm text-muted-foreground">{tr("tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={setLang} />
            <Link
              to="/physician"
              className="hidden rounded-xl border px-4 py-3 text-base font-semibold hover:bg-accent sm:inline-block"
            >
              {tr("physician")}
            </Link>
          </div>
        </div>
        {step > 0 && (
          <div className="mx-auto max-w-5xl px-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(step / (STEPS - 1)) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {tr("step")} {step} {tr("of")} {STEPS - 1}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 pb-24">
        {step === 0 && <Landing lang={lang} setLang={setLang} onStart={() => setStep(1)} />}
        {step === 1 && (
          <Identify
            lang={lang}
            patient={patient}
            setPatient={setPatient}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Intake
            lang={lang}
            messages={messages}
            setMessages={setMessages}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Documents
            lang={lang}
            documents={documents}
            setDocuments={setDocuments}
            onBack={() => setStep(2)}
            onNext={async () => {
              setStep(4);
              const answers = messages.filter((m) => m.role === "patient").map((m) => m.text);
              const labs = documents.flatMap((d) => d.labs);
              const res = await fetch("/api/generate-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers, labs, age: patient.age }),
              });
              const data = await res.json();
              const s: Summary = { ...data, physicianNotes: "", approved: false };
              setSummary(s);
              setToken(data.tokenNumber);
            }}
          />
        )}
        {step === 4 && (
          <Done
            lang={lang}
            summary={summary}
            token={token}
            onRestart={() => {
              sessionId.current = uid();
              setPatient({
                id: uid(),
                name: "",
                age: "",
                gender: "",
                phone: "",
                abhaId: "",
                consent: false,
                lang,
              });
              setMessages([]);
              setDocuments([]);
              setSummary(null);
              setToken(null);
              setStep(0);
            }}
          />
        )}
      </main>
    </div>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex overflow-hidden rounded-xl border">
      {(["en", "hi"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-4 py-3 text-base font-semibold ${
            lang === l ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
          }`}
        >
          {l === "en" ? "English" : "हिन्दी"}
        </button>
      ))}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border bg-card p-6 shadow-sm sm:p-8 ${className}`}>{children}</div>
  );
}

function BigButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "min-h-16 rounded-2xl px-8 text-lg font-bold transition-colors disabled:opacity-50 w-full sm:w-auto";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border bg-card hover:bg-accent";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function Landing({
  lang,
  setLang,
  onStart,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onStart: () => void;
}) {
  return (
    <Card className="text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t("brand", lang)}</h1>
      <p className="mt-3 text-xl text-muted-foreground">{t("tagline", lang)}</p>
      <p className="mt-10 text-lg font-semibold">{t("chooseLang", lang)}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["en", "hi"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`min-h-24 rounded-3xl border-2 text-2xl font-bold ${
              lang === l ? "border-primary bg-accent" : "border-border bg-card"
            }`}
          >
            {l === "en" ? "English" : "हिन्दी"}
          </button>
        ))}
      </div>
      <div className="mt-10">
        <BigButton onClick={onStart}>{t("start", lang)}</BigButton>
      </div>
      <div className="mt-6">
        <Link to="/physician" className="text-base font-semibold text-primary underline">
          {t("physician", lang)}
        </Link>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full min-h-16 rounded-2xl border bg-card px-5 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

function Identify({
  lang,
  patient,
  setPatient,
  onBack,
  onNext,
}: {
  lang: Lang;
  patient: Patient;
  setPatient: (p: Patient) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [error, setError] = useState("");
  const ok = patient.name && patient.age && patient.phone && patient.consent;
  return (
    <Card>
      <h2 className="text-3xl font-bold">{t("identify", lang)}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t("name", lang)}>
          <input
            className={inputCls}
            value={patient.name}
            onChange={(e) => setPatient({ ...patient, name: e.target.value })}
          />
        </Field>
        <Field label={t("age", lang)}>
          <input
            className={inputCls}
            inputMode="numeric"
            value={patient.age}
            onChange={(e) => setPatient({ ...patient, age: e.target.value })}
          />
        </Field>
        <Field label={t("gender", lang)}>
          <div className="grid grid-cols-3 gap-3">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setPatient({ ...patient, gender: g })}
                className={`min-h-16 rounded-2xl border text-lg font-semibold ${
                  patient.gender === g ? "border-primary bg-accent" : "bg-card"
                }`}
              >
                {t(g, lang)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("phone", lang)}>
          <input
            className={inputCls}
            inputMode="tel"
            value={patient.phone}
            onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("abha", lang)}>
            <input
              className={inputCls}
              value={patient.abhaId}
              onChange={(e) => setPatient({ ...patient, abhaId: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-secondary p-5">
        <p className="text-lg font-bold">{t("consentTitle", lang)}</p>
        <button
          onClick={() => setPatient({ ...patient, consent: !patient.consent })}
          className="mt-3 flex w-full items-start gap-4 text-left"
        >
          <span
            className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 text-xl ${
              patient.consent ? "border-primary bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {patient.consent ? "✓" : ""}
          </span>
          <span className="text-base leading-relaxed">{t("consentText", lang)}</span>
        </button>
      </div>

      {error && <p className="mt-4 text-base font-semibold text-destructive">{error}</p>}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <BigButton variant="ghost" onClick={onBack}>
          {t("back", lang)}
        </BigButton>
        <BigButton
          onClick={() => (ok ? onNext() : setError(t("required", lang)))}
        >
          {t("continue", lang)}
        </BigButton>
      </div>
    </Card>
  );
}

function Intake({
  lang,
  messages,
  setMessages,
  onBack,
  onNext,
}: {
  lang: Lang;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const turn = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);

  const speak = (msg: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (messages.length === 0) {
      const first =
        lang === "hi"
          ? "नमस्ते! कृपया बताइए आज आपको क्या तकलीफ़ है?"
          : "Hello! Please tell me, what problem are you facing today?";
      setMessages([{ id: uid(), role: "assistant", text: first, at: Date.now() }]);
      speak(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(value: string) {
    const clean = value.trim();
    if (!clean || busy) return;
    setText("");
    setMessages((m) => [...m, { id: uid(), role: "patient", text: clean, at: Date.now() }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turn: turn.current, lang, text: clean }),
      });
      const data = await res.json();
      turn.current += 1;
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: data.reply, at: Date.now() }]);
      speak(data.reply);
      if (data.done) setDone(true);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert(
        lang === "hi"
          ? "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया टाइप करें।"
          : "Voice input is not available in this browser. Please type instead.",
      );
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setListening(false);
      void send(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold">{t("intake", lang)}</h2>

      <div className="mt-6 max-h-[45vh] space-y-4 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "patient" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-5 py-4 text-lg leading-relaxed ${
                m.role === "patient"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="rounded-3xl bg-secondary px-5 py-4 text-lg text-muted-foreground">…</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={toggleMic}
          className={`grid min-h-16 w-full place-items-center rounded-2xl border-2 px-6 text-lg font-bold sm:w-56 ${
            listening ? "animate-pulse border-primary bg-accent" : "bg-card"
          }`}
        >
          🎤 {listening ? t("listening", lang) : t("speak", lang)}
        </button>
        <input
          className={inputCls}
          placeholder={t("typeHere", lang)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
        />
        <BigButton onClick={() => send(text)} disabled={busy}>
          {t("send", lang)}
        </BigButton>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <BigButton variant="ghost" onClick={onBack}>
          {t("back", lang)}
        </BigButton>
        <BigButton onClick={onNext} disabled={!done && messages.length < 3}>
          {t("continue", lang)}
        </BigButton>
      </div>
    </Card>
  );
}

function Documents({
  lang,
  documents,
  setDocuments,
  onBack,
  onNext,
}: {
  lang: Lang;
  documents: KioskDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<KioskDocument[]>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = uid();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const index = counter.current++;
      setDocuments((d) => [
        ...d,
        { id, fileName: file.name, kind: "", previewUrl, status: "processing", summary: "", labs: [] },
      ]);
      const res = await fetch("/api/ocr-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, index }),
      });
      const data = await res.json();
      setDocuments((d) =>
        d.map((doc) =>
          doc.id === id
            ? { ...doc, status: "done", kind: data.kind, summary: data.summary, labs: data.labs }
            : doc,
        ),
      );
    }
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold">{t("docs", lang)}</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`mt-6 rounded-3xl border-2 border-dashed p-8 text-center ${
          drag ? "border-primary bg-accent" : "border-border bg-secondary/40"
        }`}
      >
        <p className="text-lg font-semibold">{t("dropHere", lang)}</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <BigButton onClick={() => fileRef.current?.click()}>📄 {t("chooseFile", lang)}</BigButton>
          <BigButton variant="ghost" onClick={() => camRef.current?.click()}>
            📷 {t("camera", lang)}
          </BigButton>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-4">
              {doc.previewUrl ? (
                <img
                  src={doc.previewUrl}
                  alt={doc.fileName}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-secondary text-2xl">
                  📄
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{doc.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.status === "processing" ? t("processing", lang) : doc.kind}
                </p>
              </div>
            </div>
            {doc.status === "processing" && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            )}
            {doc.status === "done" && (
              <>
                <p className="mt-4 text-base leading-relaxed">{doc.summary}</p>
                {doc.labs.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {doc.labs.map((l) => (
                      <li
                        key={l.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 text-base ${
                          l.abnormal
                            ? "bg-destructive/10 font-bold text-destructive"
                            : "bg-secondary"
                        }`}
                      >
                        <span>{l.name}</span>
                        <span>
                          {l.value} {l.unit}
                          {l.abnormal && ` • ${t("abnormal", lang)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <BigButton variant="ghost" onClick={onBack}>
          {t("back", lang)}
        </BigButton>
        <BigButton onClick={onNext}>{t("finish", lang)}</BigButton>
      </div>
    </Card>
  );
}

function Done({
  lang,
  summary,
  token,
  onRestart,
}: {
  lang: Lang;
  summary: Summary | null;
  token: number | null;
  onRestart: () => void;
}) {
  if (!summary) {
    return (
      <Card className="text-center">
        <p className="text-2xl font-bold">…</p>
        <p className="mt-2 text-lg text-muted-foreground">{t("processing", lang)}</p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-3xl font-bold">{t("summary", lang)}</h2>
      <div className="mt-6 rounded-3xl bg-primary p-6 text-center text-primary-foreground">
        <p className="text-lg opacity-90">{t("token", lang)}</p>
        <p className="text-6xl font-extrabold">{token}</p>
        <p className="mt-3 text-lg">
          {t("goTo", lang)} <strong>{summary.suggestedDepartment}</strong>
        </p>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ["Chief complaint", summary.chiefComplaint],
          ["Duration", summary.duration],
          ["Medications", summary.medications],
          ["History / allergies", summary.history],
          ["Abnormal findings", summary.abnormalFindings],
          ["Urgency", summary.urgency],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-secondary p-4">
            <dt className="text-sm font-semibold uppercase text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-lg">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <BigButton variant="ghost" onClick={onRestart}>
          {t("newPatient", lang)}
        </BigButton>
        <Link to="/physician" className="w-full sm:w-auto">
          <BigButton>{t("physician", lang)}</BigButton>
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Departments available: {DEPARTMENTS.join(", ")}
      </p>
    </Card>
  );
}
