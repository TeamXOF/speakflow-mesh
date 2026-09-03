'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import StarBadge from '@/components/ChapterMap/StarBadge';
import MicButton from '@/components/Checkpoint/MicButton';
import WaveformVisualizer from '@/components/Checkpoint/WaveformVisualizer';
import ReadingPrompt from '@/components/Checkpoint/ReadingPrompt';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useReadingSession, DEMO_CHECKPOINTS } from '@/contexts/ReadingSessionContext';
import { useSpeakFlow } from '@/Context/SpeakFlowContext';

// Phase 3 imports
import MascotMessage from '@/components/Feedback/MascotMessage';
import ScoreRing from '@/components/Feedback/ScoreRing';
import MetricPills from '@/components/Feedback/MetricPills';
import WordAnalysis from '@/components/Feedback/WordAnalysis';
import PracticeSection from '@/components/Feedback/PracticeSection';
import RewardsScreen from '@/components/Rewards/RewardsScreen';

function CheckpointContent() {
  const { flowState, finishRecording, showRewards, currentCheckpointIndex, continueAdventure } = useReadingSession();
  const { status, audioData, audioBlob, startRecording, stopRecording, resetAudio } = useAudioRecorder();
  
  // API Context
  const { phase1Result, phase2Result, pipelineState, recordAndAnalyzeCheckpoint } = useSpeakFlow();
  
  const checkpoint = DEMO_CHECKPOINTS[currentCheckpointIndex % DEMO_CHECKPOINTS.length];
  
  const hasAnalyzed = useRef(false);
  
  // Wait for the hook to finish processing the Blob before calling the API
  useEffect(() => {
    if (status === 'complete' && audioBlob && !hasAnalyzed.current) {
      hasAnalyzed.current = true;
      recordAndAnalyzeCheckpoint(checkpoint.checkpoint_id, audioBlob);
      finishRecording(); // Transitions ReadingSessionContext state to 'feedback'
    }
    if (status === 'idle') {
      hasAnalyzed.current = false;
    }
  }, [status, audioBlob, finishRecording, recordAndAnalyzeCheckpoint, checkpoint.checkpoint_id]);

  if (flowState === 'rewards') {
    return <RewardsScreen checkpointNum={currentCheckpointIndex + 1} totalCheckpoints={5} onContinue={continueAdventure} />;
  }

  if (flowState === 'feedback') {
    // Determine loading states from SpeakFlow pipelineState
    const isPhase1Loading = pipelineState.stt === 'running' || pipelineState.acoustic === 'running';
    const isPhase2Loaded = pipelineState.feedback === 'done';
    const hasError = pipelineState.stt === 'error' || pipelineState.acoustic === 'error';

    if (hasError) {
      return (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-red-500 font-bold mb-6">Oops! Something went wrong analyzing the audio.</p>
          <button 
            onClick={() => {
              resetAudio();
              continueAdventure();
            }}
            className="px-8 py-3 bg-[var(--accent-primary)] text-white rounded-full font-bold shadow-md hover:bg-[#B388FF] hover:-translate-y-1 transition-all"
          >
            Try Again / Continue
          </button>
        </main>
      );
    }

    if (isPhase1Loading || !phase1Result) {
      return (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <Loader2 size={48} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-xl font-bold text-[var(--text-primary)] animate-pulse">Analyzing pronunciation...</p>
        </main>
      );
    }

    // Determine the calculated accuracy score (e.g. correct words / total words * 100)
    const correctCount = phase1Result.words.filter(w => w.correct).length;
    const accuracy = Math.round((correctCount / phase1Result.words.length) * 100) || 0;

    return (
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-start p-8 pb-16 gap-6">
        
        {/* Mascot & Header */}
        <div className="w-full mb-4">
          <MascotMessage 
            message={isPhase2Loaded && phase2Result ? "Great job!" : "Analyzing fluency..."} 
            feedbackText={phase2Result?.feedback_text}
          />
        </div>
        
        {/* Middle Row: Score and Metrics */}
        <div className="w-full flex gap-4">
          <ScoreRing score={accuracy} />
          <MetricPills accuracy={accuracy} wpm={phase1Result.wpm} pauses={phase1Result.hesitations?.length || 0} />
        </div>
        
        {/* Word by Word Analysis */}
        <div className="w-full mt-2">
          <WordAnalysis words={phase1Result.words} />
        </div>

        {/* Phase 2: Practice Section */}
        {isPhase2Loaded && phase2Result?.practice_recommendation && (
          <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <PracticeSection word={phase2Result.practice_recommendation} />
          </div>
        )}
        
        {/* Next Checkpoint Button */}
        <div className="mt-6">
          <button 
            disabled={!isPhase2Loaded}
            onClick={() => {
              resetAudio();
              showRewards();
            }}
            className={`px-8 py-4 font-bold text-xl rounded-full border-b-4 transition-all ${
              isPhase2Loaded 
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
