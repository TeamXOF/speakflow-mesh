'use client';

import { Mic, Square, Loader2 } from 'lucide-react';
import type { RecordingState } from '@/hooks/useAudioRecorder';

interface MicButtonProps {
  status: RecordingState;
  onStart: () => void;
  onStop: () => void;
}

export default function MicButton({ status, onStart, onStop }: MicButtonProps) {
  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={isProcessing}
        className={`relative flex items-center justify-center w-36 h-36 rounded-full transition-all duration-300 ${
          isRecording 
            ? 'bg-[var(--error)] scale-110 shadow-[0_0_50px_rgba(255,77,79,0.5)]' 
            : isProcessing 
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[var(--accent-primary)] hover:scale-105 shadow-xl hover:shadow-2xl'
        }`}
      >
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-[var(--error)] animate-ping opacity-50"></div>
        )}
        
        {isProcessing ? (
          <Loader2 size={64} className="text-white animate-spin" />
        ) : isRecording ? (
          <Square size={56} className="text-white fill-white" />
        ) : (
          <Mic size={64} className="text-white" />
        )}
      </button>

      <p className="font-bold text-[var(--text-secondary)] text-xl h-8">
        {isProcessing ? 'Analyzing...' : isRecording ? 'Tap to stop' : 'Tap to start recording'}
      </p>
    </div>
  );
}
