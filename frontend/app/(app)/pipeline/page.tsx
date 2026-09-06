"use client";

/**
 * Pipeline Monitor (roadmap Phase 11.2) — the real four-stage pipeline view.
 * Driven entirely by live state from SpeakFlowSessionContext: stage statuses,
 * real latency numbers from API responses, and a live log of stage transitions.
 * No hardcoded latencies, no fake terminal history, no "agents".
 */

import { useEffect, useState } from "react";
import {
  Activity, CheckCircle2, CircleDashed, Loader2, Mic2, AudioWaveform,
  MessageSquareText, HeartPulse, Terminal, XCircle,
} from "lucide-react";
import { useSpeakFlowSession } from "@/context/SpeakFlowSessionContext";
import { fetchV1Health, V1Health } from "@/lib/api";

export default function PipelineMonitorPage() {
  const { pipelineState, pipelineLogs, phase1Result, phase2Result } = useSpeakFlowSession();
  const [health, setHealth] = useState<V1Health | null>(null);

  useEffect(() => {
    fetchV1Health().then(setHealth).catch(() => setHealth(null));
    const t = setInterval(() => {
      fetchV1Health().then(setHealth).catch(() => setHealth(null));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const p1 = phase1Result?.latency_ms;
  const p2 = phase2Result?.latency_ms;

  const stages = [
    {
      key: "stt" as const,
      name: "Speech-to-Text",
      icon: Mic2,
      detail: pipelineState.stt === "done"
        ? `via ${phase1Result?.stt_source === "groq" ? "Groq Whisper" : "local Whisper"}`
        : "Groq online · local Whisper offline",
      latency: p1 ? `${p1.stt}ms` : null,
    },
    {
      key: "acoustic" as const,
      name: "Acoustic Analysis",
      icon: AudioWaveform,
      detail: pipelineState.acoustic === "done"
        ? "librosa pitch / ZCR / energy / formants vs reference dictionary"
        : "librosa features vs reference vectors",
      latency: p1 ? `${p1.acoustic}ms` : null,
    },
    {
      key: "feedback" as const,
      name: "Gemini Feedback",
      icon: MessageSquareText,
      detail: pipelineState.feedback === "done"
        ? `via ${phase2Result?.feedback_source === "gemini" ? "Gemini 3.5 Flash-Lite" : "template fallback"}`
        : "Gemini 3.5 Flash-Lite · template fallback",
      latency: p2?.gemini_feedback ? `${p2.gemini_feedback}ms` : null,
    },
    {
      key: "hesitation" as const,
      name: "Hesitation Judgment",
      icon: HeartPulse,
      detail: pipelineState.hesitation === "done"
        ? (phase2Result?.engagement_state
            ? `engagement: ${phase2Result.engagement_state.replace("_", " ")}`
            : "judged")
        : "multimodal, only on ambiguous pauses",
      latency: p2?.gemini_hesitation ? `${p2.gemini_hesitation}ms` : null,
    },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-5 h-5 text-status-complete" />;
      case "running": return <Loader2 className="w-5 h-5 text-accent-primary-dark animate-spin" />;
      case "error": return <XCircle className="w-5 h-5 text-status-needs" />;
      default: return <CircleDashed className="w-5 h-5 text-status-pending" />;
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case "done": return "bg-green-50 border-green-100";
      case "running": return "bg-accent-primary-bg border-accent-primary/30";
      case "error": return "bg-red-50 border-red-100";
      default: return "bg-gray-50 border-gray-100 opacity-70";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Pipeline Monitor</h1>
          <p className="text-sm text-text-secondary mt-1">
            Live view of the real processing stages during a Story Mode session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center px-3 py-1.5 text-xs font-mono font-bold rounded-lg border ${
            health?.groq_reachable
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-amber-50 border-amber-200 text-amber-600"
          }`}>
            <Mic2 className="w-3.5 h-3.5 mr-1.5" />
            Groq {health?.groq_reachable ? "online" : "off"}
          </span>
          <span className={`flex items-center px-3 py-1.5 text-xs font-mono font-bold rounded-lg border ${
            health?.gemini_reachable
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-amber-50 border-amber-200 text-amber-600"
          }`}>
            <MessageSquareText className="w-3.5 h-3.5 mr-1.5" />
            Gemini {health?.gemini_reachable ? "online" : "off"}
          </span>
          <span className={`flex items-center px-3 py-1.5 text-xs font-mono font-bold rounded-lg border ${
            health?.mode === "online"
              ? "bg-sky-50 border-sky-200 text-sky-600"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}>
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {health ? health.mode : "…"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: stage cards */}
        <div className="lg:col-span-5 space-y-4">
          {stages.map((s) => {
            const Icon = s.icon;
            const status = pipelineState[s.key];
            return (
              <div key={s.key} className={`speakflow-card p-4 border transition-all duration-300 ${statusBg(status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {statusIcon(status)}
                    <div className="ml-3">
                      <p className={`text-sm font-bold ${status === "idle" ? "text-text-muted" : "text-text-primary"}`}>
                        {s.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 flex items-center">
                        <Icon className="w-3 h-3 mr-1" />{s.detail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {status === "running" && (
                      <span className="text-[10px] font-mono font-bold text-accent-primary-dark tracking-wider animate-pulse block">
                        RUNNING…
                      </span>
                    )}
                    {s.latency && status === "done" && (
                      <span className="text-xs font-mono font-bold text-text-primary">{s.latency}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: live log panel */}
        <div className="lg:col-span-7 speakflow-card bg-[#1A1A1A] text-gray-300 p-6 flex flex-col font-mono text-xs min-h-[420px]">
          <div className="flex items-center mb-4 border-b border-gray-700 pb-2">
            <Terminal className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-gray-400 font-bold uppercase tracking-wider">Live Execution Log</span>
          </div>
          {pipelineLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Idle — run a Story Mode session and stage transitions will appear here live.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 opacity-90 custom-scrollbar">
              {pipelineLogs.map((line, i) => (
                <div key={i} className={line.includes("Error") || line.includes("error") ? "text-red-400" : line.includes("received") || line.includes("complete") ? "text-green-400" : ""}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
