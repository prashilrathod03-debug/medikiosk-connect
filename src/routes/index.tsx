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
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@500;700&family=Inter:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  component: Kiosk,
});

const JOURNEY = [
  { key: "identify", en: "Details", hi: "विवरण" },
  { key: "intake", en: "Talk", hi: "बातचीत" },
  { key: "docs", en: "Documents", hi: "दस्तावेज़" },
  { key: "token", en: "Token", hi: "टोकन" },
];

const serif = { fontFamily: "'Noto Serif Devanagari', serif" };

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
    <div className="min-h-screen" style={{ background: "#F7F1E4", color: "#1C2B3A" }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: "#F7F1E4EE", borderColor: "#E0D3B2" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-xl font-bold"
              style={{ background: "#D9821B", color: "#F7F1E4" }}
            >
              ✚
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight" style={serif}>
                {tr("brand")}
              </p>
              <p className="text-sm" style={{ color: "#6B5F4A" }}>
                {tr("tagline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={setLang} />
            <Link
              to="/physician"
              className="hidden rounded-full border-2 px-4 py-3 text-base font-semibold sm:inline-block"
              style={{ borderColor: "#0E5C4F", color: "#0E5C4F" }}
            >
              {tr("physician")}
            </Link>
          </div>
        </div>
        {step > 0 && <Journey step={step} lang={lang} />}
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 pb-24">
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
              try {
                const res = await fetch("/api/generate-summary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ answers, labs, age: patient.age }),
                });
                const data = await res.json();
                const s: Summary = { ...data, physicianNotes: "", approved: false };
                setSummary(s);
                setToken(data.tokenNumber ?? Math.floor(100 + Math.random() * 900));
              } catch {
                setSummary({
                  chiefComplaint: answers[0] ?? "",
                  duration: "",
                  symptoms: answers.join(" "),
                  history: "",
                  medications: "",
                  allergies: "",
                  vitalsNotes: "",
                  abnormalFindings: labs.filter((l) => l.abnormal).map((l) => l.name).join(", "),
                  suggestedDepartment: DEPARTMENTS[0],
                  urgency: "Routine",
                  physicianNotes: "",
                  approved: false,
                });
                setToken(Math.floor(100 + Math.random() * 900));
              }
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
              setPatient({ id: uid(), name: "", age: "", gender: "", phone: "", abhaId: "", consent: false, lang });
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

function Journey({ step, lang }: { step: number; lang: Lang }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-5">
      <div className="flex items-center">
        {JOURNEY.map((stop, i) => {
          const idx = i + 1;
          const active = idx === step;
          const done = idx < step;
          return (
            <div key={stop.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-colors"
                  style={{
                    background: done || active ? "#0E5C4F" : "#E5D8B8",
                    color: done || active ? "#F7F1E4" : "#8A7B5C",
                    boxShadow: active ? "0 0 0 4px #D9821B44" : "none",
                  }}
                >
                  {done ? "✓" : idx}
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: active ? "#1C2B3A" : "#8A7B5C" }}
                >
                  {lang === "hi" ? stop.hi : stop.en}
                </span>
              </div>
              {i < JOURNEY.length - 1 && (
                <div className="mx-2 mb-4 h-0.5 flex-1" style={{ background: done ? "#0E5C4F" : "#E5D8B8" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex overflow-hidden rounded-full border-2" style={{ borderColor: "#E0D3B2" }}>
      {(["en", "hi"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className="px-4 py-2.5 text-sm font-bold"
          style={
            lang === l
              ? { background: "#0E5C4F", color: "#F7F1E4" }
              : { background: "transparent", color: "#6B5F4A" }
          }
        >
          {l === "en" ? "EN" : "हि"}
        </button>
      ))}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[2rem] border p-6 sm:p-9 ${className}`}
      style={{ background: "#FFFDF7", borderColor: "#E5D8B8" }}
    >
      {children}
    </div>
  );
}

function BigButton({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const styles: React.CSSProperties =
    variant === "primary"
      ? { background: "#D9821B", color: "#FFFDF7" }
      : { background: "transparent", color: "#1C2B3A", border: "2px solid #E5D8B8" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-h-16 w-full rounded-full px-8 text-lg font-bold transition-opacity disabled:opacity-40 sm:w-auto"
      style={styles}
    >
      {children}
    </button>
  );
}

function Landing({ lang, setLang, onStart }: { lang: Lang; setLang: (l: Lang) => void; onStart: () => void }) {
  return (
    <Card className="text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl" style={serif}>
        {t("brand", lang)}
      </h1>
      <p className="mt-3 text-xl" style={{ color: "#6B5F4A" }}>
        {t("tagline", lang)}
      </p>
      <p className="mt-10 text-lg font-semibold">{t("chooseLang", lang)}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["en", "hi"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="min-h-24 rounded-2xl border-2 text-2xl font-bold transition-colors"
            style={
              lang === l
                ? { borderColor: "#D9821B", background: "#F3E4C8" }
                : { borderColor: "#E5D8B8", background: "#FFFDF7" }
            }
          >
            {l === "en" ? "English" : "हिन्दी"}
          </button>
        ))}
      </div>
      <div className="mt-10">
        <BigButton onClick={onStart}>{t("start", lang)}</BigButton>
      </div>
      <div className="mt-6">
        <Link to="/physician" className="text-base font-semibold underline" style={{ color: "#0E5C4F" }}>
          {t("physician", lang)}
        </Link>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold">{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#FFFDF7",
  border: "2px solid #E5D8B8",
  color: "#1C2B3A",
};
const inputCls = "w-full min-h-16 rounded-2xl px-5 text-lg outline-none focus:ring-2";

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
      <h2 className="text-3xl font-bold" style={serif}>
        {t("identify", lang)}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t("name", lang)}>
          <input className={inputCls} style={inputStyle} value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
        </Field>
        <Field label={t("age", lang)}>
          <input className={inputCls} style={inputStyle} inputMode="numeric" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
        </Field>
        <Field label={t("gender", lang)}>
          <div className="grid grid-cols-3 gap-3">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setPatient({ ...patient, gender: g })}
                className="min-h-16 rounded-2xl border-2 text-lg font-semibold"
                style={patient.gender === g ? { borderColor: "#D9821B", background: "#F3E4C8" } : { borderColor: "#E5D8B8", background: "#FFFDF7" }}
              >
                {t(g, lang)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("phone", lang)}>
          <input className={inputCls} style={inputStyle} inputMode="tel" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("abha", lang)}>
            <input className={inputCls} style={inputStyle} value={patient.abhaId} onChange={(e) => setPatient({ ...patient, abhaId: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="mt-8 rounded-2xl p-5" style={{ background: "#F3E4C8" }}>
        <p className="text-lg font-bold">{t("consentTitle", lang)}</p>
        <button onClick={() => setPatient({ ...patient, consent: !patient.consent })} className="mt-3 flex w-full items-start gap-4 text-left">
          <span
            className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 text-xl"
            style={patient.consent ? { borderColor: "#0E5C4F", background: "#0E5C4F", color: "#FFFDF7" } : { borderColor: "#C9B98F", background: "#FFFDF7" }}
          >
            {patient.consent ? "✓" : ""}
          </span>
          <span className="text-base leading-relaxed">{t("consentText", lang)}</span>
        </button>
      </div>

      {error && (
        <p className="mt-4 text-base font-semibold" style={{ color: "#B8452E" }}>
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <BigButton variant="ghost" onClick={onBack}>
          {t("back", lang)}
        </BigButton>
        <BigButton onClick={() => (ok ? onNext() : setError(t("required", lang)))}>{t("continue", lang)}</BigButton>
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
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: lang === "hi" ? "क्षमा करें, कृपया फिर से प्रयास करें।" : "Sorry, please try again.",
          at: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert(lang === "hi" ? "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया टाइप करें।" : "Voice input is not available in this browser. Please type instead.");
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
      <h2 className="text-3xl font-bold" style={serif}>
        {t("intake", lang)}
      </h2>

      <div className="mt-6 max-h-[45vh] space-y-4 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "patient" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-3xl px-5 py-4 text-lg leading-relaxed"
              style={
                m.role === "patient"
                  ? { background: "#0E5C4F", color: "#FFFDF7" }
                  : { background: "#EDE2CC", color: "#1C2B3A" }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="rounded-3xl px-5 py-4 text-lg" style={{ background: "#EDE2CC", color: "#8A7B5C" }}>
            …
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={toggleMic}
          className="grid min-h-16 w-full place-items-center rounded-2xl border-2 px-6 text-lg font-bold sm:w-56"
          style={listening ? { borderColor: "#D9821B", background: "#F3E4C8" } : { borderColor: "#E5D8B8", background: "#FFFDF7" }}
        >
          🎤 {listening ? t("listening", lang) : t("speak", lang)}
        </button>
        <input
          className={inputCls}
          style={inputStyle}
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
      setDocuments((d) => [...d, { id, fileName: file.name, kind: "", previewUrl, status: "processing", summary: "", labs: [] }]);
      try {
        const res = await fetch("/api/ocr-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, index }),
        });
        const data = await res.json();
        setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, status: "done", kind: data.kind, summary: data.summary, labs: data.labs } : doc)));
      } catch {
        setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, status: "done", kind: "Document", summary: "Could not read this file automatically.", labs: [] } : doc)));
      }
    }
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold" style={serif}>
        {t("docs", lang)}
      </h2>

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
        className="mt-6 rounded-3xl border-2 border-dashed p-8 text-center"
        style={drag ? { borderColor: "#D9821B", background: "#F3E4C8" } : { borderColor: "#E5D8B8", background: "#F3ECDA" }}
      >
        <p className="text-lg font-semibold">{t("dropHere", lang)}</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <BigButton onClick={() => fileRef.current?.click()}>📄 {t("chooseFile", lang)}</BigButton>
          <BigButton variant="ghost" onClick={() => camRef.current?.click()}>
            📷 {t("camera", lang)}
          </BigButton>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => void handleFiles(e.target.files)} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void handleFiles(e.target.files)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-3xl border p-5" style={{ borderColor: "#E5D8B8", background: "#FFFDF7" }}>
            <div className="flex items-center gap-4">
              {doc.previewUrl ? (
                <img src={doc.previewUrl} alt={doc.fileName} className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl text-2xl" style={{ background: "#EDE2CC" }}>
                  📄
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{doc.fileName}</p>
                <p className="text-sm" style={{ color: "#8A7B5C" }}>
                  {doc.status === "processing" ? t("processing", lang) : doc.kind}
                </p>
              </div>
            </div>
            {doc.status === "processing" && (
              <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "#EDE2CC" }}>
                <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "#D9821B" }} />
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
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-base"
                        style={l.abnormal ? { background: "#B8452E1A", color: "#B8452E", fontWeight: 700 } : { background: "#EDE2CC" }}
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

function Done({ lang, summary, token, onRestart }: { lang: Lang; summary: Summary | null; token: number | null; onRestart: () => void }) {
  if (!summary) {
    return (
      <Card className="text-center">
        <p className="text-2xl font-bold">…</p>
        <p className="mt-2 text-lg" style={{ color: "#8A7B5C" }}>
          {t("processing", lang)}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-3xl font-bold" style={serif}>
        {t("summary", lang)}
      </h2>
      <div className="mt-6 rounded-3xl p-6 text-center" style={{ background: "#0E5C4F", color: "#FFFDF7" }}>
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
          <div key={k} className="rounded-2xl p-4" style={{ background: "#EDE2CC" }}>
            <dt className="text-sm font-semibold uppercase" style={{ color: "#8A7B5C" }}>
              {k}
            </dt>
            <dd className="mt-1 text-lg">{v || "—"}</dd>
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
      <p className="mt-4 text-sm" style={{ color: "#8A7B5C" }}>
        Departments available: {DEPARTMENTS.join(", ")}
      </p>
    </Card>
  );
}
