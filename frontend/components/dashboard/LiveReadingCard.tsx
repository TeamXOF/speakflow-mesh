"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Lightbulb, RefreshCw, Volume2 } from "lucide-react";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { fetchWordTip, WordTip, API_ROOT } from "@/lib/api";
import { prettyPhoneme } from "@/lib/phonemes";
import type { ScoredWord, SpokenWord } from "@/context/SpeakFlowContext";
import { popoverPosition } from "@/lib/popover";
import { speak, stopSpeaking } from "@/lib/speech";

const norm = (w: string) => w.toLowerCase().replace(/[.,!?]/g, "").trim();

/** One tappable transcript word + its pronunciation card, colored by the
 *  real alignment scoring (not by the agents' word list). */
type DisplayItem = {
  text: string;
  correct: boolean;
  label: string | null;
  missed: boolean;
  extra: boolean;
  meta?: SpokenWord;
};

function TranscriptWord({
  item, open, onToggle, pos, tip, tipLoading, isUrdu,
}: {
  item: DisplayItem;
  open: boolean;
  onToggle: (rect: DOMRect) => void;
  pos: { left: number; top: number; openUp: boolean } | null;
  tip: WordTip | null;
  tipLoading: boolean;
  isUrdu: boolean;
}) {
  const clean = item.text.replace(/[.,!?]/g, "");
  const tone = item.correct
    ? "border-transparent"
    : item.missed || item.extra || !item.label
    ? "bg-red-50 border-red-200 text-red-600"
    : "bg-amber-50 border-amber-200 text-amber-600";
  const stateLabel = item.missed
    ? "Missed"
    : item.extra
    ? "Not in the sentence"
    : item.correct
    ? "Good"
    : item.label
    ? "Needs practice"
    : "Missed";

  return (
    <span className="relative inline-block">
      <button
        onClick={(e) => onToggle(e.currentTarget.getBoundingClientRect())}
        title={stateLabel}
        className={`inline-block mr-2 px-1 rounded transition-all cursor-pointer border-b-2 ${tone} ${
          item.missed ? "line-through decoration-2" : ""
        } ${open ? "ring-2 ring-accent-primary-dark" : ""}`}
      >
        {item.text}
      </button>

      {open && pos && (
        <div
          dir={isUrdu ? "rtl" : "ltr"}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: 256, transform: pos.openUp ? "translateY(-100%)" : undefined }}
          className={`bg-white rounded-xl border-2 border-gray-100 shadow-xl p-3 z-30 text-left ${isUrdu ? "font-urdu" : ""}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-extrabold text-text-primary">{clean}</span>
            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
              item.correct
                ? "bg-green-50 border-green-200 text-green-600"
                : item.missed || item.extra || !item.label
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}>
              {stateLabel}
            </span>
          </div>

          {item.missed && (
            <p className="text-xs text-red-500 font-bold mb-2">
              You skipped this word — it was not in your reading.
            </p>
          )}
          {item.extra && (
            <p className="text-xs text-red-500 font-bold mb-2">
              This word is not in the sentence — don&apos;t add extra words.
            </p>
          )}

          {item.meta && (item.meta.duration_ms != null || item.meta.probability != null) && (
            <p className="text-[11px] font-mono text-text-muted mb-2">
              {item.meta.duration_ms != null && <span>{(item.meta.duration_ms / 1000).toFixed(1)}s </span>}
              {item.meta.probability != null && <span>· speech confidence {Math.round((item.meta.probability || 0) * 100)}%</span>}
            </p>
          )}

          {/* letter tiles + hear-it button */}
          <div className="flex flex-wrap gap-1 mb-2">
            {clean.split("").map((ch, j) => (
              <span
                key={j}
                className="h-7 min-w-7 px-1 rounded-md bg-accent-primary-bg text-accent-primary-dark text-sm font-extrabold flex items-center justify-center"
              >
                {ch}
              </span>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); speak(clean, isUrdu ? "ur" : "en", 0.8); }}
            className="mb-2 px-2.5 py-1 rounded-lg bg-accent-primary-dark text-white text-xs font-bold hover:bg-accent-primary inline-flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5" /> {isUrdu ? "سنیں" : "Hear this word"}
          </button>

          {item.label && (
            <p className="text-xs mb-2">
              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-bold" dir="auto">
                {prettyPhoneme(item.label)}
              </span>
            </p>
          )}

          {tipLoading ? (
            <p className="text-xs text-text-muted animate-pulse">Getting a tip…</p>
          ) : tip && tip.tip ? (
            <div className="flex items-start gap-1.5 bg-bg-base rounded-lg p-2">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-accent-primary-dark shrink-0" />
              <p className="text-xs text-text-primary leading-relaxed">{tip.tip}</p>
            </div>
          ) : item.correct ? (
            <p className="text-xs text-text-muted">Read clearly — keep it up!</p>
          ) : null}
        </div>
      )}
    </span>
  );
}

export default function LiveReadingCard() {
  const { sessionState, transcript, agents, recordingTime, audioVolume, targetSentence, setTargetSentence, availableSentences, spokenWords, scoredWords, replaceSentences, addNotification, language } = useSpeakFlow();
  const isUrdu = language === "ur";

  // Dynamic warm-up sentences: fresh set per difficulty, regenerated on demand
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loadingSentences, setLoadingSentences] = useState(false);

  const loadSentences = async (diff: "easy" | "medium" | "hard", lang: "en" | "ur" = language) => {
    if (loadingSentences) return;
    setLoadingSentences(true);
    try {
      const res = await fetch(`${API_ROOT}/pipeline/sentences?difficulty=${diff}&count=5&language=${lang}`);
      if (!res.ok) throw new Error("sentence service unavailable");
      const data = await res.json();
      replaceSentences(data.sentences || []);
    } catch {
      addNotification({
        title: "Couldn't generate sentences",
        message: "Using the built-in practice sentences for now.",
        type: "warning",
      });
    } finally {
      setLoadingSentences(false);
    }
  };

  // Fresh sentences on open AND whenever the reading language flips
  useEffect(() => { loadSentences(difficulty, language); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [language]);

  const isListening = sessionState === "listening";
  const isProcessing = sessionState === "processing";
  const isIdle = sessionState === "idle" || sessionState === "complete";

  // Build the display from the REAL alignment scoring; fall back to plain
  // transcript tokens if the scorer returned nothing (e.g. legacy sessions)
  const displayItems: DisplayItem[] = [];
  if (scoredWords.length > 0) {
    let cursor = 0;
    for (const sw of scoredWords as ScoredWord[]) {
      if (!sw.spoken) {
        // a printed word the child never said
        displayItems.push({ text: sw.word, correct: false, label: null, missed: true, extra: false });
        continue;
      }
      let meta: SpokenWord | undefined;
      for (let i = cursor; i < spokenWords.length; i++) {
        if (norm(spokenWords[i].word) === norm(sw.spoken)) {
          meta = spokenWords[i];
          cursor = i + 1;
          break;
        }
      }
      displayItems.push({
        text: sw.spoken,
        correct: sw.correct,
        label: sw.phoneme_mismatch ?? null,
        missed: false,
        extra: !!sw.extra,
        meta,
      });
    }
  } else {
    displayItems.push(...transcript.split(" ").filter(Boolean).map((w) => ({
      text: w, correct: true, label: null, missed: false, extra: false,
    })));
  }

  // Tap-a-word state + per-word tip cache (one API call per word per visit)
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [activeTip, setActiveTip] = useState<WordTip | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const tipsRef = useRef<Map<string, WordTip>>(new Map());

  // Any scroll (including the transcript box itself) closes the popover so it
  // never detaches from its word.
  useEffect(() => {
    if (openIdx == null) return;
    const close = () => setOpenIdx(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openIdx, isUrdu]);

  return (
    <div className="speakflow-card p-6 flex flex-col h-full bg-white relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-sans text-text-primary flex items-center">
          {isListening && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></div>}
          {!isListening && <div className="w-2 h-2 rounded-full bg-gray-300 mr-2"></div>}
          Live Acoustic Reading Analysis
        </h2>
        {isListening && (
          <span className="text-xs font-mono font-bold text-red-500 px-2 py-1 bg-red-50 rounded animate-pulse">
            LISTENING
          </span>
        )}
        {isProcessing && (
          <span className="text-xs font-mono font-bold text-status-inprogress px-2 py-1 bg-accent-primary-bg rounded">
            PROCESSING
          </span>
        )}
        {isIdle && (
          <span className="text-xs font-mono font-bold text-text-muted px-2 py-1 bg-gray-100 rounded">
            {sessionState === "complete" ? "COMPLETED" : "INACTIVE"}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col space-y-4">
        {/* Target Sentence Display / Selector */}
        <div className="bg-gray-50 border-l-4 border-accent-primary p-4 rounded-r-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Target Sentence</h3>
            {isIdle && (
              <div className="flex items-center gap-1.5">
                <select
                  value={difficulty}
                  onChange={(e) => {
                    const d = e.target.value as "easy" | "medium" | "hard";
                    setDifficulty(d);
                    loadSentences(d);
                  }}
                  disabled={loadingSentences}
                  className="text-xs border-gray-300 rounded text-gray-700 bg-white py-1 px-2 focus:ring-accent-primary focus:border-accent-primary disabled:opacity-60"
                  title="Sentence difficulty — generates a fresh set"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <button
                  onClick={() => loadSentences(difficulty)}
                  disabled={loadingSentences}
                  title="Generate 5 fresh sentences"
                  className="p-1.5 rounded-md border border-gray-300 text-gray-500 hover:text-accent-primary-dark hover:border-accent-primary disabled:opacity-60 transition-colors bg-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSentences ? "animate-spin" : ""}`} />
                </button>
                <select
                  value={targetSentence}
                  onChange={(e) => setTargetSentence(e.target.value)}
                  className="text-xs border-gray-300 rounded text-gray-700 bg-white py-1 px-2 focus:ring-accent-primary focus:border-accent-primary"
                >
                  {availableSentences.map((s, i) => (
                    <option key={i} value={s}>Sentence {i + 1}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p
              dir={isUrdu ? "rtl" : "ltr"}
              className={`text-xl ${isUrdu ? "font-urdu" : "font-serif"} text-gray-800 leading-relaxed`}
            >
              {targetSentence}
            </p>
            {isIdle && (
              <button
                onClick={() => speak(targetSentence, language, 0.9)}
                title="Hear the sentence read aloud"
                className="shrink-0 h-10 w-10 rounded-full bg-accent-primary-bg text-accent-primary-dark hover:bg-accent-primary hover:text-white transition-colors flex items-center justify-center"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Audio / Transcript Visualizer */}
        <div className="flex-1 min-h-24 max-h-64 bg-bg-base rounded-xl p-6 border border-gray-100 shadow-inner overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Transcript</h3>
          <p
            dir={isUrdu ? "rtl" : "ltr"}
            className={`text-2xl ${isUrdu ? "font-urdu" : "font-sans"} font-medium leading-relaxed text-text-primary break-words`}
          >
          {transcript === "" ? (
            <span className="text-gray-400 italic">Waiting for audio input...</span>
          ) : (
            <>
              {displayItems.map((item, i) => (
                <TranscriptWord
                  key={i}
                  item={item}
                  isUrdu={isUrdu}
                  open={openIdx === i}
                  onToggle={(rect) => {
                    if (openIdx === i) { setOpenIdx(null); return; }
                    setAnchorRect(rect);
                    setOpenIdx(i);
                  }}
                  pos={openIdx === i && anchorRect ? popoverPosition(anchorRect) : null}
                  tip={openIdx === i ? activeTip : null}
                  tipLoading={openIdx === i && tipLoading}
                />
              ))}
              {openIdx !== null && (
                <button
                  aria-label="Close word tip"
                  onClick={() => setOpenIdx(null)}
                  className="fixed inset-0 z-20 cursor-default"
                />
              )}
            </>
          )}
        </p>
          {transcript !== "" && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-status-complete" /> Good
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-[#FFB020]" /> Needs practice
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-[#FF4D4F]" /> Missed
              </span>
              {openIdx === null && (
                <span className="text-[10px] text-text-muted ml-auto">
                  Tap any word to see how to say it.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200 transition-all duration-300">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${isListening ? 'bg-red-500' : 'bg-gray-300'}`}>
          {isListening ? <Mic className="w-5 h-5 text-white animate-pulse" /> : <MicOff className="w-5 h-5 text-gray-500" />}
        </div>
        <div className="ml-4 flex-1 h-6 flex items-center space-x-1">
          {/* Dynamic Audio Waveform */}
          {[...Array(30)].map((_, i) => {
            // Calculate a wave height based on volume and random jitter, but only if listening
            const randomFactor = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
            const volumeHeight = isListening ? Math.max(10, Math.min(100, audioVolume * randomFactor)) : 20;
            const opacity = isListening ? Math.max(0.3, Math.min(1, audioVolume / 100)) : 0.3;

            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${isListening ? 'bg-red-400' : 'bg-gray-300'}`}
                style={{
                  height: `${volumeHeight}%`,
                  opacity: opacity
                }}
              ></div>
            );
          })}
        </div>
        <span className="text-xs font-mono text-text-muted ml-4">
          00:{recordingTime.toString().padStart(2, '0')} / 00:30
        </span>
      </div>
    </div>
  );
}
