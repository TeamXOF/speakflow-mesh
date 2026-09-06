"use client";

/**
 * Teacher Hub — Session Analysis (UI guide: Teacher Experience, panel 3).
 * Renders the roadmap's checkpoint-based story sessions AND the Gen-1
 * five-agent pipeline sessions (dual mode), with honest source badges
 * (roadmap UI Prompt 6: stt_source / feedback_source visible per session).
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Star, Bot, CheckCircle2, Loader2, Wifi, WifiOff, Volume2, HeartPulse,
} from "lucide-react";
import { fetchSessionDetail, fetchSessions, fetchSessionDiagnosis, SessionDetail } from "@/lib/api";

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const isOnline = source === "groq" || source === "gemini";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
        isOnline
          ? "bg-sky-50 border-sky-200 text-sky-600"
          : "bg-amber-50 border-amber-200 text-amber-600"
      }`}
      title={isOnline ? "Cloud service used" : "Offline/fallback path used"}
    >
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {source === "groq" ? "Groq STT" : source === "local_fallback" ? "Offline STT" : source === "gemini" ? "Gemini" : "Template"}
    </span>
  );
}

function EngagementBadge({ state }: { state: string | null }) {
  if (!state || state === "unknown") return null;
  const styles: Record<string, string> = {
    confident: "bg-green-50 border-green-200 text-green-700",
    anxious: "bg-amber-50 border-amber-200 text-amber-600",
    frustrated: "bg-red-50 border-red-200 text-red-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${styles[state] || "bg-gray-50 border-gray-200 text-gray-500"}`}>
      <HeartPulse className="w-3 h-3" />
      {state}
    </span>
  );
}

/** Per-word chips (roadmap Phase 8): green = correct, amber = needs practice
 *  (mispronounced, has a mismatch label), red = missed/skipped entirely. */
function WordChips({ words, rtl }: { words: { word: string; correct: boolean; phoneme_mismatch: string | null }[]; rtl: boolean }) {
  if (!words.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {words.map((w, i) => {
        const tone = w.correct
          ? "bg-green-50 border-green-200 text-green-700"
          : w.phoneme_mismatch
          ? "bg-amber-50 border-amber-200 text-amber-600"
          : "bg-red-50 border-red-200 text-red-600";
        return (
          <span key={i} dir={rtl ? "rtl" : "ltr"}
            className={`px-2 py-0.5 rounded-md text-xs font-bold border ${tone} ${rtl ? "font-urdu" : ""}`}>
            {w.word}
          </span>
        );
      })}
    </div>
  );
}

// ── v2 story session view ────────────────────────────────────────────────────
function V2SessionView({ detail }: { detail: SessionDetail }) {
  const isUrdu = detail.language === "ur";
  const totals = detail.totals;
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="speakflow-card bg-white p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-4xl">{detail.story_emoji}</span>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-text-primary">{detail.story_title}</h2>
            <p className="text-sm text-text-secondary">
              {detail.student_name} · {detail.created_at?.slice(0, 16).replace("T", " ")} · {detail.language.toUpperCase()}
              {detail.mode === "offline" && " · offline session"}
            </p>
          </div>
          <div className="text-center px-5 py-3 bg-accent-primary-bg rounded-xl border border-accent-primary/20">
            <p className="text-2xl font-extrabold text-text-primary">{totals.avg_accuracy != null ? `${totals.avg_accuracy}%` : "--"}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Session accuracy</p>
          </div>
          <div className="text-center px-5 py-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-2xl font-extrabold text-amber-500 flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />{totals.stars}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Stars</p>
          </div>
        </div>
      </div>

      {/* Checkpoint overview */}
      <div className="speakflow-card bg-white p-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Checkpoint Overview</h3>
        <p className="text-xs text-text-secondary mb-4">
          {totals.checkpoints_passed}/{totals.checkpoints_total} checkpoints passed
        </p>
        <div className="space-y-3">
          {detail.checkpoints.map((cp, i) => {
            const attempted = cp.status === "attempted";
            return (
              <div key={cp.checkpoint_id} className="px-4 py-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center text-white ${cp.passed ? "bg-status-complete" : attempted ? "bg-status-anxious" : "bg-gray-300"}`}>
                    {i + 1}
                  </span>
                  <p dir={isUrdu ? "rtl" : "ltr"} className={`flex-1 text-sm font-bold text-text-primary ${isUrdu ? "font-urdu" : ""}`}>
                    {cp.target_text}
                  </p>
                  <span className={`text-xs font-mono font-bold ${cp.passed ? "text-status-complete" : attempted ? "text-status-anxious" : "text-text-muted"}`}>
                    {attempted ? `${cp.accuracy}%` : "pending"}
                  </span>
                  {attempted && (
                    <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{cp.stars}
                    </span>
                  )}
                </div>

                {attempted && (
                  <div className="ml-10 space-y-2">
                    <p className="text-xs text-text-muted">
                      <span className="font-bold">Read:</span>{" "}
                      <span dir={isUrdu ? "rtl" : "ltr"} className={isUrdu ? "font-urdu" : ""}>
                        {cp.transcript || "—"}
                      </span>
                    </p>
                    <WordChips words={cp.words} rtl={isUrdu} />
                    <div className="flex flex-wrap gap-2 items-center">
                      <SourceBadge source={cp.stt_source} />
                      <SourceBadge source={cp.feedback_source} />
                      <EngagementBadge state={cp.engagement_state} />
                      <span className="text-xs font-mono text-text-muted">
                        {cp.wpm ? `${Math.round(cp.wpm)} WPM` : ""}
                        {cp.hesitations.length > 0 && ` · ${cp.hesitations.length} pause${cp.hesitations.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                    {cp.feedback_text && (
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-xs font-bold text-accent-primary-dark mb-0.5 flex items-center">
                          <Volume2 className="w-3.5 h-3.5 mr-1" /> Feedback
                        </p>
                        <p dir={isUrdu ? "rtl" : "ltr"} className={`text-xs text-text-secondary leading-relaxed ${isUrdu ? "font-urdu" : ""}`}>
                          {cp.feedback_text}
                        </p>
                        {cp.practice_recommendation && (
                          <p dir={isUrdu ? "rtl" : "ltr"} className={`text-xs text-text-primary mt-1.5 ${isUrdu ? "font-urdu" : ""}`}>
                            <span className="font-bold">Practice:</span> {cp.practice_recommendation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Gen-1 five-agent session view ────────────────────────────────────────────
type Gen1Session = {
  id: string; student_name: string; timestamp: string; target_sentence: string | null;
  transcript: string | null; wpm: number | null; accuracy: number | null; overall_score: number | null;
};
type Gen1Diagnosis = {
  phonetic_result: any; difficulty_result: any; engagement_result: any;
  practice_result: any; progress_result: any;
};

function Gen1SessionView({ session, diagnosis }: { session: Gen1Session; diagnosis: Gen1Diagnosis | null }) {
  const agents = [
    { key: "phonetic_result", name: "Phonetic Analyst" },
    { key: "difficulty_result", name: "Difficulty Assessor" },
    { key: "engagement_result", name: "Engagement Tracker" },
    { key: "practice_result", name: "Practice Generator" },
    { key: "progress_result", name: "Progress Synthesizer" },
  ];
  return (
    <div className="space-y-6">
      <div className="speakflow-card bg-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Live pipeline session</p>
            <h2 className="text-xl font-extrabold text-text-primary">{session.student_name}</h2>
            <p className="text-sm text-text-secondary">{session.timestamp?.slice(0, 16).replace("T", " ")}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-5 py-3 bg-accent-primary-bg rounded-xl border border-accent-primary/20">
              <p className="text-2xl font-extrabold text-text-primary">{session.overall_score ?? "--"}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Health score</p>
            </div>
            <div className="text-center px-5 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-2xl font-extrabold text-status-good">{session.accuracy != null ? `${Math.round(session.accuracy * 100)}%` : "--"}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Accuracy</p>
            </div>
            <div className="text-center px-5 py-3 bg-sky-50 rounded-xl border border-sky-100">
              <p className="text-2xl font-extrabold text-text-primary">{session.wpm ? Math.round(session.wpm) : "--"}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">WPM</p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-accent-primary">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Target sentence</p>
            <p className="text-sm text-text-primary">{session.target_sentence || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-status-good">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Transcript</p>
            <p className="text-sm text-text-primary">{session.transcript || "—"}</p>
          </div>
        </div>
      </div>

      <div className="speakflow-card bg-white p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-text-muted" /> Multi-Agent Diagnosis
        </h3>
        {!diagnosis ? (
          <p className="text-sm text-text-muted">No diagnosis stored for this session.</p>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => {
              const result = (diagnosis as any)[a.key];
              return (
                <div key={a.key} className="px-4 py-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    {result && !result.error
                      ? <CheckCircle2 className="w-4 h-4 text-status-complete" />
                      : <Loader2 className="w-4 h-4 text-gray-300" />}
                    <p className="text-sm font-bold text-text-primary">{a.name}</p>
                  </div>
                  {result && !result.error && (
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans pl-6">
                      {JSON.stringify(result, null, 1)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = typeof params.id === "string" ? params.id : (params.id as string[])?.[0];

  const [v2Detail, setV2Detail] = useState<SessionDetail | null>(null);
  const [gen1Session, setGen1Session] = useState<Gen1Session | null>(null);
  const [gen1Diagnosis, setGen1Diagnosis] = useState<Gen1Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        // v2 first (story sessions)
        setV2Detail(await fetchSessionDetail(sessionId));
      } catch {
        try {
          // Gen-1 fallback (5-agent pipeline sessions)
          const all: Gen1Session[] = await fetchSessions();
          const found = all.find((s) => s.id === sessionId);
          if (found) {
            setGen1Session(found);
            try {
              setGen1Diagnosis(await fetchSessionDiagnosis(sessionId));
            } catch { /* diagnosis optional */ }
          }
        } catch { /* neither */ }
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions" className="p-2 rounded-full bg-white border border-gray-200 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Session Details</h1>
          <p className="text-sm text-text-secondary">Detailed breakdown of a reading session</p>
        </div>
      </div>

      {loading ? (
        <div className="speakflow-card bg-white p-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
        </div>
      ) : v2Detail ? (
        <V2SessionView detail={v2Detail} />
      ) : gen1Session ? (
        <Gen1SessionView session={gen1Session} diagnosis={gen1Diagnosis} />
      ) : (
        <div className="speakflow-card bg-white p-16 text-center">
          <p className="text-text-muted mb-2">Session not found.</p>
          <Link href="/sessions" className="text-sm font-bold text-accent-primary-dark hover:underline">
            Back to all sessions
          </Link>
        </div>
      )}
    </div>
  );
}
