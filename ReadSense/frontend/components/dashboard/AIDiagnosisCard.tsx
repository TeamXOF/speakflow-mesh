"use client";

import { Activity, Brain, FileWarning, AlertTriangle, Loader2, Zap } from "lucide-react";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

export default function AIDiagnosisCard() {
  const { sessionState, agents, overallScore, wpm, transcript } = useSpeakFlow();

  const phoneticAgent   = agents.find(a => a.id === "phonetic");
  const difficultyAgent = agents.find(a => a.id === "difficulty");
  const engagementAgent = agents.find(a => a.id === "engagement");

  const isComplete   = sessionState === "complete";
  const isProcessing = sessionState === "processing";

  // Real data from agents
  const primaryIssue: string | null  = difficultyAgent?.result?.primary_issue || null;
  const emotionalState: string | null = engagementAgent?.result?.emotional_state || null;
  const displayScore = overallScore ?? (isComplete ? "--" : "--");

  // Sounds to practice — each chip carries the transcript words it targets so a
  // child knows exactly what to work on. The phonetic agent now returns
  // {label, words}; older plain strings get example words derived heuristically.
  const transcriptWords = transcript
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z']/g, ""))
    .filter(Boolean);
  const deriveWords = (label: string): string[] => {
    const cleaned = label.toLowerCase().replace(/blend|cluster|digraph|sound|vowel|controlled|long|short|schwa|smooth/g, " ");
    const patterns = (cleaned.match(/[a-z]{1,3}/g) || []).sort((a, b) => b.length - a.length);
    for (const pat of patterns) {
      const hits = [...new Set(transcriptWords.filter((w) => w.includes(pat) && !["the", "and", "through"].includes(w)))];
      if (hits.length) return hits.slice(0, 3);
    }
    return [];
  };
  type PhChallenge = { label: string; words: string[] };
  const challenges: PhChallenge[] = (phoneticAgent?.result?.struggling_phonemes || [])
    .map((item: any): PhChallenge =>
      typeof item === "string"
        ? { label: item, words: deriveWords(item) }
        : { label: item?.label ?? "", words: item?.words?.length ? item.words : deriveWords(item?.label ?? "") })
    .filter((c: PhChallenge) => c.label);

  // Colour-code the score
  const scoreColour =
    typeof overallScore === "number"
      ? overallScore >= 85 ? "text-status-good"
      : overallScore >= 65 ? "text-status-anxious"
      : "text-status-needs"
      : "text-text-muted";

  return (
    <div className="speakflow-card p-6 h-full bg-white relative overflow-hidden">
      <h2 className="text-lg font-bold font-sans text-text-primary mb-4 flex items-center">
        <Brain className="w-5 h-5 mr-2 text-accent-primary-dark" />
        Multi-Agent Diagnosis
      </h2>

      {/* Idle overlay */}
      {sessionState === "idle" && (
        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <Brain className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-gray-500 font-bold mb-1">Awaiting Session</h3>
          <p className="text-sm text-gray-400">Start a session to generate a diagnosis.</p>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-12 h-12 text-accent-primary-dark animate-spin mb-4" />
          <h3 className="text-accent-primary-dark font-bold mb-1">Agents Diagnosing...</h3>
          <p className="text-sm text-gray-500">Synthesising multi-modal telemetry.</p>
        </div>
      )}

      {/* Score row */}
      <div className="flex items-center justify-between p-4 bg-accent-primary-bg rounded-xl border border-accent-primary/20 mb-6">
        <div>
          <p className="text-base font-mono font-bold text-accent-primary-dark tracking-wider mb-1">
            READING HEALTH SCORE
          </p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold font-sans ${scoreColour}`}>
              {displayScore}
            </span>
            <span className="text-sm text-text-secondary mb-1">/100</span>
            {typeof wpm === "number" && (
              <span className="text-base font-mono text-text-muted mb-1 ml-3">
                {wpm} WPM
              </span>
            )}
          </div>
        </div>
        <div className={`h-12 w-12 rounded-full border-4 flex items-center justify-center ${isComplete ? "border-status-good" : "border-gray-200"}`}>
          <Activity className={`w-5 h-5 ${isComplete ? "text-status-good" : "text-gray-300"}`} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Sounds to practice */}
        <div>
          <div className="flex items-center mb-1">
            <FileWarning className={`w-4 h-4 mr-2 ${isComplete ? "text-status-anxious" : "text-gray-400"}`} />
            <h3 className="text-lg font-bold text-text-primary">Sounds to Practice</h3>
          </div>
          <p className="text-base text-text-muted mb-2">
            {challenges.length > 0
              ? "Each sound shows the words that need attention."
              : "The sounds the analyst wants you to work on."}
          </p>
          <div className="flex flex-wrap gap-2">
            {challenges.length > 0 ? (
              challenges.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100"
                >
                  <span className="block text-base font-bold text-status-anxious" dir="auto">{c.label}</span>
                  {c.words.length > 0 && (
                    <span className="block text-sm text-text-secondary mt-0.5">
                      in: {c.words.join(", ")}
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">
                {isComplete ? "No challenges detected." : "—"}
              </span>
            )}
          </div>
        </div>

        {/* Primary issue */}
        <div>
          <div className="flex items-center mb-2">
            <AlertTriangle className={`w-4 h-4 mr-2 ${isComplete ? "text-status-needs" : "text-gray-400"}`} />
            <h3 className="text-lg font-bold text-text-primary">Primary Issue</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryIssue ? (
              <span className="px-3 py-2 bg-red-50 text-status-needs text-base font-medium rounded-full border border-red-100" dir="auto">
                {primaryIssue}
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic">
                {isComplete ? "No issues detected." : "—"}
              </span>
            )}
          </div>
        </div>

        {/* Emotional state */}
        {isComplete && emotionalState && (
          <div>
            <div className="flex items-center mb-2">
              <Zap className="w-4 h-4 mr-2 text-accent-primary-dark" />
              <h3 className="text-lg font-bold text-text-primary">Emotional State</h3>
            </div>
            <span className="px-3 py-2 bg-accent-primary-bg text-accent-primary-dark text-base font-medium rounded-full border border-accent-primary/20 capitalize">
              {emotionalState.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
