'use client';

import { use, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import StarBadge from '@/components/ChapterMap/StarBadge';
import MicButton from '@/components/Checkpoint/MicButton';
import WaveformVisualizer from '@/components/Checkpoint/WaveformVisualizer';
import ReadingPrompt from '@/components/Checkpoint/ReadingPrompt';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useReadingSession, DEMO_CHECKPOINTS } from '@/contexts/ReadingSessionContext';

// Phase 3 imports
import MascotMessage from '@/components/Feedback/MascotMessage';
import ScoreRing from '@/components/Feedback/ScoreRing';
import MetricPills from '@/components/Feedback/MetricPills';
import WordAnalysis from '@/components/Feedback/WordAnalysis';
import PracticeSection from '@/components/Feedback/PracticeSection';
import RewardsScreen from '@/components/Rewards/RewardsScreen';

const mockPhase1 = {
  session_id: "sess_demo",
  checkpoint_id: "cp_2",
  phase: 1,
  transcript: "the little explorer climbed the",
  words: [
    { word: "the", correct: true, phoneme_mismatch: null },
    { word: "little", correct: true, phoneme_mismatch: null },
    { word: "explorer", correct: false, phoneme_mismatch: "x_vs_s" },
    { word: "climbed", correct: true, phoneme_mismatch: null },
    { word: "the", correct: false, phoneme_mismatch: null },
  ],
  wpm: 62,
  hesitations: [{ after_word: "explorer", pause_ms: 850, flagged_ambiguous: true }],
  stt_source: "groq" as const,
  latency_ms: { stt: 190, acoustic: 110, scoring: 25, total_phase1: 395 },
  warnings: [],
};

const mockPhase2 = {
  session_id: "sess_demo",
  checkpoint_id: "cp_2",
  phase: 2,
  feedback_text: "Try to pronounce 'explorer' a little slower. You did great on the other words!",
  engagement_state: "confident" as const,
  comprehension_question: "What did the explorer climb?",
  practice_recommendation: "explorer",
  feedback_source: "gemini" as const,
  latency_ms: { gemini_feedback: 240, gemini_hesitation: 210 },
};

function CheckpointContent() {
  const { flowState, finishRecording, showRewards, currentCheckpointIndex, continueAdventure } = useReadingSession();
  
  const { status, audioData, startRecording, stopRecording, resetAudio } = useAudioRecorder();
  const [phase2Loaded, setPhase2Loaded] = useState(false);
  
  const checkpoint = DEMO_CHECKPOINTS[currentCheckpointIndex % DEMO_CHECKPOINTS.length];
  
  useEffect(() => {
    if (status === 'complete') {
      finishRecording();
    }
  }, [status, finishRecording]);

  useEffect(() => {
    if (flowState === 'feedback') {
      // Reset state on mount
      setPhase2Loaded(false);
      // Simulate API Phase 2 delay
      const timer = setTimeout(() => {
        setPhase2Loaded(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [flowState]);

  if (flowState === 'rewards') {
    return <RewardsScreen checkpointNum={currentCheckpointIndex + 1} totalCheckpoints={5} onContinue={continueAdventure} />;
  }

  if (flowState === 'feedback') {
    return (
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-start p-8 pb-16 gap-6">
        
        {/* Mascot & Header */}
        <div className="w-full mb-4">
          <MascotMessage 
            message="Great job!" 
            feedbackText={phase2Loaded ? mockPhase2.feedback_text : undefined}
          />
        </div>
        
        {/* Middle Row: Score and Metrics */}
        <div className="w-full flex gap-4">
          <ScoreRing score={85} />
          <MetricPills accuracy={85} wpm={mockPhase1.wpm} pauses={mockPhase1.hesitations.length} />
        </div>
        
        {/* Word by Word Analysis */}
        <div className="w-full mt-2">
          <WordAnalysis words={mockPhase1.words} />
        </div>

        {/* Phase 2: Practice Section */}
        {phase2Loaded && (
          <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <PracticeSection word={mockPhase2.practice_recommendation} />
          </div>
        )}
        
        {/* Next Checkpoint Button */}
        <div className="mt-6">
          <button 
            disabled={!phase2Loaded}
            onClick={() => {
              resetAudio();
              showRewards();
            }}
            className={`px-8 py-4 font-bold text-xl rounded-full border-b-4 transition-all ${
              phase2Loaded 
                ? "bg-[var(--accent-primary)] text-white hover:bg-[#B388FF] hover:-translate-y-1 border-[#9B8AF0] active:translate-y-0 active:border-b-0" 
                : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border-[#CBD5E1] opacity-90"
            }`}
          >
            Next Checkpoint →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 pb-16 gap-16">
      <ReadingPrompt text={checkpoint.target_text} />
      
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
        {/* Waveform container - fixed height so layout doesn't jump */}
        <div className="h-32 w-full flex items-end justify-center">
           {status === 'recording' && <WaveformVisualizer audioData={audioData} />}
        </div>
        
        <MicButton status={status} onStart={startRecording} onStop={stopRecording} />
      </div>
    </main>
  );
}

export default function CheckpointPage() {
  const { totalStars, currentCheckpointIndex, goBackToMap } = useReadingSession();

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] flex flex-col font-sans overflow-hidden">
      
      {/* Playful background decor */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-white rounded-full blur-[120px] opacity-80 pointer-events-none" />
      <div className="absolute bottom-[-10vw] left-[-10vw] w-[40vw] h-[40vw] bg-[var(--accent-secondary)] rounded-full blur-[100px] opacity-40 pointer-events-none" />

      {/* Topbar */}
      <header className="relative z-10 w-full p-8 flex items-center justify-between">
        <button onClick={goBackToMap} className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 rounded-full shadow-md border border-gray-100 transition-colors">
          <ArrowLeft size={28} className="text-[var(--text-primary)]" />
          <span className="font-bold text-xl text-[var(--text-primary)]">Map</span>
        </button>
        
        <div className="bg-white/90 backdrop-blur-md px-10 py-4 rounded-full shadow-md border border-gray-100">
          <span className="font-bold text-2xl text-[var(--text-primary)]">Checkpoint {currentCheckpointIndex + 1} of 5</span>
        </div>
        
        <StarBadge count={totalStars} />
      </header>

      {/* Main Content */}
      <CheckpointContent />
    </div>
  );
}
