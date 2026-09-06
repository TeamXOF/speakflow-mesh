"use client";

/**
 * Story Mode — Story Play screen (UI guide: Student Experience S2–S6).
 * Phone-style card: checkpoint sentence → big mic with symmetric wave →
 * Phase-1 feedback with mascot + score ring + word-by-word chips + legend →
 * Phase-2 mascot speech bubble + practice → per-checkpoint rewards →
 * story-complete celebration. Zero teacher-facing detail on screen.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Star, Mic, Square, RotateCcw, ArrowRight, Volume2, Loader2, Lightbulb,
} from "lucide-react";
import { useSpeakFlowSession } from "@/context/SpeakFlowSessionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import Mascot from "@/components/read/Mascot";
import { fetchWordTip, WordTip, Phase1Word } from "@/lib/api";
import { prettyPhoneme } from "@/lib/phonemes";
import { loadPrefs } from "@/lib/prefs";
import { speak } from "@/lib/speech";
import { popoverPosition } from "@/lib/popover";

function ScoreRing({ value }: { value: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const color = value >= 85 ? "#34C759" : value >= 70 ? "#A89EDB" : "#FFB020";
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F0EDFC" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-extrabold text-text-primary">{value}%</span>
      </div>
    </div>
  );
}

export default function StoryPlayPage() {
  const params = useParams();
  const router = useRouter();
  const routeSessionId = typeof params.sessionId === "string" ? params.sessionId : (params.sessionId as string[])?.[0];
  const { user, isTeacher } = useAuth();

  const {
    sessionId, session, checkpoints, currentCheckpointIndex, currentCheckpoint,
    language, phase1Result, phase2Result, pipelineState, isRecording, audioVolume,
    sessionComplete, startRecording, stopRecordingAndAnalyze, retryCheckpoint,
    advanceCheckpoint, adoptSession, refreshSession, resetSession,
  } = useSpeakFlowSession();

  const [starsLocal, setStarsLocal] = useState(0);
  const [showRewards, setShowRewards] = useState(false);
  // Reading preferences are read once per visit (change them in Settings, then
  // come back to Story Mode)
  const [prefs] = useState(() => loadPrefs());

  // Tap-a-word pronunciation popover
  const [openWordIdx, setOpenWordIdx] = useState<number | null>(null);
  const [wordAnchor, setWordAnchor] = useState<DOMRect | null>(null);
  const [activeTip, setActiveTip] = useState<WordTip | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const tipsRef = useRef<Map<string, WordTip>>(new Map());

  // Any scroll closes the popover so it never detaches from its word
  useEffect(() => {
    if (openWordIdx == null) return;
    const close = () => setOpenWordIdx(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openWordIdx]);

  useEffect(() => {
    if (routeSessionId && sessionId !== routeSessionId) {
      adoptSession(routeSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSessionId]);

  useEffect(() => {
    if (phase1Result?.stars) setStarsLocal((s) => s + phase1Result.stars);
    setOpenWordIdx(null); // new checkpoint (or retry) closes any open word tip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase1Result?.checkpoint_id]);

  // Load (and cache) the pronunciation tip for the tapped word
  useEffect(() => {
    if (openWordIdx == null || !phase1Result) return;
    const w = phase1Result.words[openWordIdx];
    if (!w) return;
    const key = `${w.word.toLowerCase()}|${w.phoneme_mismatch || ""}`;
    const cached = tipsRef.current.get(key);
    if (cached) {
      setActiveTip(cached);
      setTipLoading(false);
      return;
    }
    let cancelled = false;
    setTipLoading(true);
    setActiveTip(null);
    fetchWordTip(w.word, language, w.phoneme_mismatch || "", w.spoken || "")
      .then((t) => {
        if (cancelled) return;
        tipsRef.current.set(key, t);
        setActiveTip(t);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTipLoading(false); });
    return () => { cancelled = true; };
  }, [openWordIdx, phase1Result, language]);

  useEffect(() => {
    if (sessionComplete) refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionComplete]);

  const isUrdu = language === "ur";
  const total = checkpoints.length;
  const number = Math.min(currentCheckpointIndex + 1, total);
  const isProcessing = pipelineState.stt === "running";
  const hasFeedback = !!phase1Result;
  const phase2Ready = !!phase2Result?.feedback_text;
  const stars = session?.totals?.stars ?? starsLocal;

  const handleNext = () => setShowRewards(true);
  const handleContinueAdventure = () => {
    setShowRewards(false);
    advanceCheckpoint();
  };

  const StarsPill = () => (
    <div className="flex items-center gap-1.5 bg-white border-2 border-amber-200 rounded-full px-3 py-1">
      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
      <span className="text-sm font-extrabold text-amber-500 font-mono">{stars}</span>
    </div>
  );

  // ── Story complete ─────────────────────────────────────────────────────────
  if (sessionComplete) {
    const passedCount = session?.totals?.checkpoints_passed ?? 0;
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[28px] border-2 border-gray-100 shadow-xl p-8 text-center">
          <div className="flex justify-center mb-2">
            <Mascot mood="celebrate" className="h-24 w-24" />
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary mb-1">
            {isUrdu ? "شاباش!" : "Awesome!"}
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            {isUrdu
              ? `آپ نے پوری کہانی مکمل کر لی! ${passedCount}/${total} چیک پوائنٹس`
              : `You mastered the story — ${passedCount}/${total} checkpoints!`}
          </p>

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex flex-col items-center">
              <Star className="w-9 h-9 fill-amber-400 text-amber-400 mb-1" />
              <span className="text-2xl font-extrabold text-text-primary">+{session?.totals?.stars ?? stars}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {isUrdu ? "ستارے" : "Stars"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-1">🏆</span>
              <span className="text-2xl font-extrabold text-text-primary">+1</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {isUrdu ? "بیج" : "Badge"}
              </span>
            </div>
          </div>

          <button
            onClick={() => { resetSession(); router.push("/read"); }}
            className="w-full py-4 rounded-2xl bg-accent-primary-dark text-white text-base font-bold shadow-lg hover:bg-accent-primary transition-colors inline-flex items-center justify-center gap-2"
          >
            {isUrdu ? "مزید کہانیاں پڑھیں" : "Back to Your Journey"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!currentCheckpoint) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
      </div>
    );
  }

  const initials = (user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // ── Main play card ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base flex items-start sm:items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[28px] border-2 border-gray-100 shadow-xl p-5 min-h-[620px] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push("/read")}
            className="h-9 w-9 rounded-full bg-gray-50 border border-gray-200 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            {isUrdu ? `چیک پوائنٹ ${number} از ${total}` : `Checkpoint ${number} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <StarsPill />
            <span className="h-9 w-9 rounded-full bg-accent-primary-bg text-accent-primary-dark flex items-center justify-center text-[10px] font-extrabold">
              {initials}
            </span>
          </div>
        </div>

        {/* ── Reading state ── */}
        {!hasFeedback && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 rounded-2xl bg-bg-base border border-gray-100 flex flex-col items-center justify-center p-6">
              <p
                dir={isUrdu ? "rtl" : "ltr"}
                className={`${prefs.biggerText ? "text-3xl" : "text-2xl"} text-center leading-relaxed text-text-primary font-bold ${isUrdu ? "font-urdu" : ""}`}
              >
                {currentCheckpoint.target_text}
              </p>
              <button
                onClick={() => speak(currentCheckpoint.target_text, isUrdu ? "ur" : "en", 0.9)}
                disabled={isProcessing}
                className="mt-4 px-4 py-2 rounded-full bg-white border border-gray-200 text-text-secondary hover:text-accent-primary-dark hover:border-accent-primary transition-colors text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                {isUrdu ? "پہلے سنیں" : "Hear it first"}
              </button>
            </div>
            <p className="text-center text-sm text-text-secondary mt-4 mb-6">
              {isProcessing
                ? (isUrdu ? "سن رہے ہیں…" : "Listening…")
                : (isUrdu ? "گہرا سانس لیں اور زور سے پڑھیں!" : "Take a deep breath and read aloud!")}
            </p>

            {/* Mic + symmetric waveform */}
            <div className="pb-2 flex flex-col items-center">
              <div className="flex items-center gap-2.5 mb-6 h-12">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((d) => (
                  <WaveBar key={`l${d}`} dist={d} isRecording={isRecording} volume={audioVolume} />
                ))}
                {isProcessing ? (
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => (isRecording ? stopRecordingAndAnalyze() : startRecording())}
                    className={`h-20 w-20 rounded-full text-white shadow-xl flex items-center justify-center transition-all shrink-0 ${
                      isRecording
                        ? "bg-red-400 scale-105 animate-pulse"
                        : "bg-accent-primary-dark hover:scale-105 ring-8 ring-accent-primary-bg"
                    }`}
                  >
                    {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-8 h-8" />}
                  </button>
                )}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <WaveBar key={`r${d}`} dist={d} isRecording={isRecording} volume={audioVolume} />
                ))}
              </div>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">
                {isRecording
                  ? (isUrdu ? "روکیں جب مکمل ہو" : "Tap to stop recording")
                  : (isUrdu ? "پڑھنا شروع کریں" : "Tap to start recording")}
              </p>
            </div>
          </div>
        )}

        {/* ── Phase 1 feedback ── */}
        {hasFeedback && !showRewards && phase1Result && (
          <div className="flex-1 flex flex-col animate-slide-up">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-1">
                <Mascot mood={phase1Result.passed ? "happy" : "encourage"} />
              </div>
              <h2 className="text-3xl font-extrabold text-text-primary mt-1">
                {phase1Result.passed ? (isUrdu ? "شاباش!" : "Great job!") : (isUrdu ? "اچھی کوشش!" : "Nice try!")}
              </h2>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-4 mb-4">
              <ScoreRing value={phase1Result.accuracy} />
              <div className="flex-1">
                <p className="text-sm font-extrabold text-text-primary mb-2">
                  {phase1Result.accuracy >= 85 ? "Good Reading!" : phase1Result.accuracy >= 70 ? "Almost there!" : "Keep going!"}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between text-text-secondary">
                    <span>{isUrdu ? "درستگی" : "Accuracy"}</span>
                    <span className="font-mono font-bold text-text-primary">{phase1Result.accuracy}%</span>
                  </p>
                  <p className="flex justify-between text-text-secondary">
                    <span>{isUrdu ? "رفتار" : "Fluency"}</span>
                    <span className="font-mono font-bold text-text-primary">{Math.round(phase1Result.wpm)} WPM</span>
                  </p>
                  <p className="flex justify-between text-text-secondary">
                    <span>{isUrdu ? "وقفے" : "Pauses"}</span>
                    <span className="font-mono font-bold text-text-primary">{phase1Result.hesitations.length}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Word by Word — tap a word for pronunciation help */}
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              Word by Word
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {phase1Result.words.map((w, i) => (
                <WordChip
                  key={i}
                  w={w}
                  isUrdu={isUrdu}
                  open={openWordIdx === i}
                  onToggle={(rect) => {
                    if (!prefs.wordTips) return;
                    if (openWordIdx === i) { setOpenWordIdx(null); return; }
                    setWordAnchor(rect);
                    setOpenWordIdx(i);
                  }}
                  pos={openWordIdx === i && wordAnchor ? popoverPosition(wordAnchor) : null}
                  tip={openWordIdx === i ? activeTip : null}
                  tipLoading={openWordIdx === i && tipLoading}
                />
              ))}
            </div>
            {openWordIdx !== null && (
              <button
                aria-label="Close word tip"
                onClick={() => setOpenWordIdx(null)}
                className="fixed inset-0 z-20 cursor-default"
              />
            )}
            {/* Legend */}
            <div className="flex items-center gap-4 mb-auto">
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-status-complete" /> Good
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-[#FFB020]" /> Needs practice
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-[#FF4D4F]" /> Missed
              </span>
            </div>
            {prefs.wordTips && (
              <p className="text-[10px] text-text-muted mt-1 mb-2">
                {isUrdu ? "کسی لفظ پر ٹیپ کریں — بتائیں گے کہ کیسے بولیں گے" : "Tap any word to see how to say it"}
              </p>
            )}

            {/* Phase 2 mascot bubble */}
            {phase2Ready ? (
              <div className="mt-5 animate-slide-up">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-11 w-11 shrink-0">
                    <Mascot mood="thinking" className="h-11 w-11" />
                  </div>
                  <div className="bg-bg-base rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                    <p className="text-xs font-extrabold text-accent-primary-dark mb-0.5">
                      {isUrdu ? "بہتر کرنے کا مشورہ" : "Here's how you can make it even better."}
                    </p>
                    <p dir={isUrdu ? "rtl" : "ltr"} className={`text-sm text-text-primary leading-relaxed ${isUrdu ? "font-urdu" : ""}`}>
                      {phase2Result!.feedback_text}
                    </p>
                  </div>
                </div>
                {phase2Result!.practice_recommendation && (
                  <div className="rounded-2xl border border-gray-100 p-4 mb-4">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                      {isUrdu ? "آئیے مل کر مشق کریں" : "Let's Practice Together"}
                    </p>
                    <div className="flex items-center justify-between bg-bg-base rounded-xl px-4 py-2.5">
                      <span dir={isUrdu ? "rtl" : "ltr"} className={`font-bold text-text-primary ${isUrdu ? "font-urdu" : ""}`}>
                        {phase2Result!.practice_recommendation}
                      </span>
                      <Volume2 className="w-5 h-5 text-accent-primary-dark" />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl bg-accent-primary-dark text-white text-base font-bold shadow-lg hover:bg-accent-primary transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isUrdu ? "اگلا چیک پوائنٹ" : "Next Checkpoint"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="mt-5">
                {phase1Result.passed ? (
                  <>
                    <div className="text-center py-3 text-xs font-mono uppercase tracking-wider text-text-muted animate-pulse rounded-xl bg-gray-50">
                      {isUrdu ? "آپ کے مشورے تیار ہو رہے ہیں…" : "Getting your tips ready…"}
                    </div>
                    {pipelineState.feedback === "error" && (
                      <div className="mt-3">
                        <p className="text-center text-xs text-text-secondary mb-2">
                          {isUrdu ? "مشورے ابھی تک نہیں آئے — کوئی بات نہیں!" : "The tips didn't arrive this time — no worries!"}
                        </p>
                        <button
                          onClick={handleNext}
                          className="w-full py-3.5 rounded-2xl bg-accent-primary-dark text-white text-base font-bold shadow-lg hover:bg-accent-primary transition-colors inline-flex items-center justify-center gap-2"
                        >
                          {isUrdu ? "اگلا چیک پوائنٹ" : "Next Checkpoint"}
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={retryCheckpoint}
                    className="w-full py-3.5 rounded-2xl bg-accent-secondary text-white text-base font-bold shadow-lg hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {isUrdu ? "دوبارہ کوشش کریں" : "Try again"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Rewards interstitial ── */}
        {hasFeedback && showRewards && (
          <div className="flex-1 flex flex-col animate-slide-up">
            <div className="text-center mt-6 mb-2">
              <div className="flex items-end justify-center gap-2">
                <Mascot mood="celebrate" className="h-24 w-24" />
                <span className="text-5xl mb-3">🏆</span>
              </div>
              <h2 className="text-3xl font-extrabold text-text-primary mt-3">
                {isUrdu ? "زندہ باد!" : "Awesome!"}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {isUrdu ? `آپ نے چیک پوائنٹ ${number} مکمل کیا` : `You completed Checkpoint ${number}`}
              </p>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-gray-100 p-4 mt-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                  {isUrdu ? "آپ کی پیش رفت" : "Your Progress"}
                </p>
                <span className="text-sm font-extrabold font-mono text-text-primary">{number} / {total}</span>
              </div>
              <div className="h-3.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-primary-dark transition-all duration-700"
                  style={{ width: `${(number / Math.max(total, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Rewards box */}
            <div className="rounded-2xl border border-gray-100 p-4 mt-3 mb-auto">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3">Rewards</p>
              <div className="flex items-center justify-around">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span className="text-lg font-extrabold text-text-primary">+{phase1Result?.stars ?? 0} Stars</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎖️</span>
                  <span className="text-lg font-extrabold text-text-primary">
                    {number === total ? "+1 Badge" : "Keep going!"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinueAdventure}
              className="w-full py-3.5 rounded-2xl bg-accent-primary-dark text-white text-base font-bold shadow-lg hover:bg-accent-primary transition-colors inline-flex items-center justify-center gap-2 mt-5"
            >
              {number === total
                ? (isUrdu ? "کہانی مکمل کریں" : "Finish Story")
                : (isUrdu ? "مزید پڑھیں" : "Continue Adventure")}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WaveBar({ dist, isRecording, volume }: { dist: number; isRecording: boolean; volume: number }) {
  // volume is a 0-255 byte average; cap the bar inside the h-12 (48px) row
  const h = isRecording
    ? Math.min(44, Math.max(6, (volume / 100) * (34 - dist * 2.4) + 6))
    : 6;
  return (
    <span
      className={`w-1 rounded-full transition-all duration-100 ${isRecording ? "bg-accent-primary" : "bg-gray-200"}`}
      style={{ height: `${h}px` }}
    />
  );
}

/**
 * Tap-a-word chip: shows the same Good/Needs-practice/Missed chip, and when
 * tapped opens a small pronunciation card — letter tiles, syllable breaks,
 * what the child actually said, the sound confusion, and a coach tip
 * (Gemini-generated once per word, cached server-side + client-side).
 */
function WordChip({
  w, isUrdu, open, onToggle, pos, tip, tipLoading,
}: {
  w: Phase1Word;
  isUrdu: boolean;
  open: boolean;
  onToggle: (rect: DOMRect) => void;
  pos: { left: number; top: number; openUp: boolean } | null;
  tip: WordTip | null;
  tipLoading: boolean;
}) {
  const missed = !w.correct && !w.phoneme_mismatch;
  const tone = w.correct
    ? "bg-green-50 border-green-200 text-green-700"
    : missed
    ? "bg-red-50 border-red-200 text-red-600"
    : "bg-amber-50 border-amber-200 text-amber-600";
  const label = w.correct ? "Good" : missed ? "Missed" : "Needs practice";
  const saidDiffers =
    !w.correct && !!w.spoken && w.spoken.trim().toLowerCase() !== w.word.toLowerCase();

  return (
    <span className="relative inline-block">
      <button
        dir={isUrdu ? "rtl" : "ltr"}
        onClick={(e) => onToggle(e.currentTarget.getBoundingClientRect())}
        title={label}
        className={`px-2.5 py-1 rounded-lg text-sm font-bold border transition-shadow ${tone} ${isUrdu ? "font-urdu" : ""} ${
          open ? "ring-2 ring-accent-primary-dark shadow-md" : ""
        }`}
      >
        {w.word}
      </button>

      {open && pos && (
        <div
          dir={isUrdu ? "rtl" : "ltr"}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: 256, transform: pos.openUp ? "translateY(-100%)" : undefined }}
          className={`bg-white rounded-xl border-2 border-gray-100 shadow-xl p-3 z-30 text-left ${isUrdu ? "font-urdu" : ""}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-extrabold text-text-primary">{w.word}</span>
            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${tone}`}>
              {label}
            </span>
          </div>

          {saidDiffers && (
            <p className="text-xs text-text-secondary mb-2">
              You said: <span className="font-bold text-red-500">{w.spoken}</span>
            </p>
          )}

          {/* Letter tiles */}
          <div className="flex flex-wrap gap-1 mb-2" dir="ltr">
            {w.word.split("").map((ch, j) => (
              <span
                key={j}
                className="h-7 min-w-7 px-1 rounded-md bg-accent-primary-bg text-accent-primary-dark text-sm font-extrabold flex items-center justify-center"
              >
                {ch}
              </span>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); speak(w.word, isUrdu ? "ur" : "en", 0.8); }}
            className="mb-2 px-2.5 py-1 rounded-lg bg-accent-primary-dark text-white text-xs font-bold hover:bg-accent-primary inline-flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5" /> {isUrdu ? "سنیں" : "Hear this word"}
          </button>

          {/* Syllable breaks */}
          {tip && tip.syllables.length > 1 && (
            <p className="text-xs text-text-primary mb-2" dir="auto">
              Say it in parts:{" "}
              <span className="font-extrabold">{tip.syllables.join(" – ")}</span>
            </p>
          )}

          {/* Sound confusion hint */}
          {w.phoneme_mismatch && (
            <p className="text-xs mb-2">
              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-bold">
                {prettyPhoneme(w.phoneme_mismatch)}
              </span>
            </p>
          )}

          {/* Coach tip */}
          {tipLoading ? (
            <p className="text-xs text-text-muted animate-pulse">Getting a tip…</p>
          ) : tip?.tip ? (
            <div className="flex items-start gap-1.5 bg-bg-base rounded-lg p-2">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-accent-primary-dark shrink-0" />
              <p className="text-xs text-text-primary leading-relaxed" dir="auto">{tip.tip}</p>
            </div>
          ) : null}
        </div>
      )}
    </span>
  );
}
