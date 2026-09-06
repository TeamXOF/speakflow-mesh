import { Timer, Zap, Volume2, PauseCircle } from "lucide-react";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

export default function SessionSummaryCard() {
  const { sessionState, wpm, accuracy, pauses, recordingTime } = useSpeakFlow();

  const isComplete = sessionState === "complete";
  const isProcessing = sessionState === "processing";
  const isListening = sessionState === "listening";

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const stats = {
    wpm: isComplete && wpm != null ? wpm : "--",
    accuracy: isComplete && accuracy != null ? accuracy : "--",
    pauses: isComplete && pauses != null ? pauses : "--",
    duration: isListening || isProcessing ? "Running..." : isComplete ? formatDuration(recordingTime) : "--"
  };

  const statBoxes = [
    { label: "READING RATE", value: isComplete ? `${stats.wpm} WPM` : stats.wpm, icon: Zap, color: "text-purple-500", bg: "bg-purple-100" },
    { label: "ACCURACY", value: isComplete ? `${stats.accuracy}%` : stats.accuracy, icon: Volume2, color: "text-status-good", bg: "bg-green-100" },
    { label: "LONG PAUSES", value: stats.pauses, icon: PauseCircle, color: "text-status-needs", bg: "bg-red-100" },
    { label: "DURATION", value: stats.duration, icon: Timer, color: "text-blue-500", bg: "bg-blue-100" },
  ];

  return (
    <div className="speakflow-card p-6 h-full bg-white flex flex-col justify-between">
      <h2 className="text-lg font-bold font-sans text-text-primary mb-4">Session Telemetry</h2>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        {statBoxes.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`bg-bg-base rounded-xl p-4 border flex flex-col justify-center transition-all ${isListening ? 'border-red-200 animate-pulse' : 'border-gray-100'}`}>
              <div className="flex items-center mb-2">
                <div className={`p-1.5 rounded-lg ${isComplete || isListening ? stat.bg : 'bg-gray-100'} mr-2 transition-colors`}>
                  <Icon className={`w-4 h-4 ${isComplete || isListening ? stat.color : 'text-gray-400'}`} />
                </div>
                <span className="text-xs font-mono font-semibold text-text-muted">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold font-sans pl-1 ${isComplete ? 'text-text-primary' : 'text-gray-400'}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
