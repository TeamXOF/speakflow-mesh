"use client";

import LiveReadingCard from "@/components/dashboard/LiveReadingCard";
import SessionSummaryCard from "@/components/dashboard/SessionSummaryCard";
import AIDiagnosisCard from "@/components/dashboard/AIDiagnosisCard";
import AgentsAtWorkCard from "@/components/dashboard/AgentsAtWorkCard";
import PracticeCard from "@/components/dashboard/PracticeCard";
import ProgressChart from "@/components/dashboard/ProgressChart";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

export default function Dashboard() {
  const { sessionState, startSession, stopListening, resetSession } = useSpeakFlow();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Reading Session Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Live monitoring and multi-agent analysis.</p>
        </div>
        
        {sessionState === "idle" && (
          <button 
            onClick={startSession}
            className="px-4 py-2 bg-text-primary text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            Start Session
          </button>
        )}
        
        {sessionState === "listening" && (
          <button 
            onClick={stopListening}
            className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm animate-pulse"
          >
            Stop Listening & Analyze
          </button>
        )}

        {(sessionState === "processing" || sessionState === "complete") && (
          <button 
            onClick={resetSession}
            className="px-4 py-2 bg-gray-200 text-text-primary text-sm font-bold rounded-lg hover:bg-gray-300 transition-colors shadow-sm"
          >
            New Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Row 1: 7 / 5 */}
        <div className="lg:col-span-7 min-w-0">
          <LiveReadingCard />
        </div>
        <div className="lg:col-span-5 min-w-0">
          <SessionSummaryCard />
        </div>

        {/* Row 2: 6 / 6 */}
        <div className="lg:col-span-6 min-w-0">
          <AIDiagnosisCard />
        </div>
        <div className="lg:col-span-6 min-w-0">
          <AgentsAtWorkCard />
        </div>

        {/* Row 3: 6 / 6 */}
        <div className="lg:col-span-6 min-w-0">
          <PracticeCard />
        </div>
        <div className="lg:col-span-6 min-w-0">
          <ProgressChart />
        </div>
      </div>
    </div>
  );
}
