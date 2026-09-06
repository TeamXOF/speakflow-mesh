"use client";

import { Bot, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

export default function AgentsAtWorkCard() {
  const { agents } = useSpeakFlow();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-status-complete" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-status-inprogress animate-spin" />;
      default:
        return <CircleDashed className="w-5 h-5 text-status-pending" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-50 border-green-100";
      case "processing": return "bg-accent-primary-bg border-accent-primary/30";
      default: return "bg-gray-50 border-gray-100 opacity-60";
    }
  };

  const getAgentSummary = (agent: any) => {
    if (agent.status !== "complete" || !agent.result) return null;
    
    switch (agent.id) {
      case "phonetic":
        return agent.result.reasoning || "Phonetics analyzed.";
      case "difficulty":
        return agent.result.primary_issue ? `Primary Issue: ${agent.result.primary_issue}` : "Difficulty analyzed.";
      case "engagement":
        return agent.result.emotional_state ? `Detected state: ${agent.result.emotional_state.replace('_', ' ')}` : "Engagement tracked.";
      case "practice":
        return agent.result.focus_area ? `Focus: ${agent.result.focus_area}` : "Practice generated.";
      case "progress":
        return agent.result.trend ? `Trend: ${agent.result.trend}` : "Progress tracked.";
      default:
        return "Analysis complete.";
    }
  };

  return (
    <div className="speakflow-card p-6 h-full bg-white flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold font-sans text-text-primary flex items-center">
          <Bot className="w-5 h-5 mr-2 text-text-muted" />
          Agents at Work
        </h2>
        <span className="text-sm font-mono font-semibold text-text-secondary bg-bg-base px-2.5 py-1 rounded">5 ACTIVE</span>
      </div>

      <div className="space-y-3 mt-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className={`flex flex-col p-3 rounded-lg border transition-all duration-300 ${getStatusBg(agent.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(agent.status)}
                <span className={`ml-3 text-lg font-semibold ${agent.status === 'pending' ? 'text-text-muted' : 'text-text-primary'}`}>
                  {agent.name}
                </span>
              </div>
              {agent.status === 'processing' && (
                <span className="text-sm font-mono font-bold text-accent-primary-dark tracking-wider animate-pulse">
                  ANALYZING...
                </span>
              )}
            </div>
            {agent.status === 'complete' && agent.result && (
              <div className="mt-2.5 ml-8 text-base text-text-secondary italic border-l-2 border-green-200 pl-2 leading-relaxed">
                {getAgentSummary(agent)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
