'use client';
import { Check, Lock } from 'lucide-react';

export type ChapterStatus = 'completed' | 'in_progress' | 'locked';

interface MapNodeProps {
  id: string;
  number: number;
  title: string;
  status: ChapterStatus;
  onClick?: () => void;
}

export default function MapNode({ number, title, status, onClick }: MapNodeProps) {
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const isLocked = status === 'locked';

  return (
    <div 
      className={`relative flex flex-col items-center gap-2 group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => {
        if (!isLocked && onClick) onClick();
      }}
    >
      <div 
        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-transform ${!isLocked && 'group-hover:scale-105'} ${
          isCompleted 
            ? 'bg-[var(--success)] border-white shadow-[0_4px_0_rgba(0,0,0,0.2)]' 
            : isInProgress 
              ? 'bg-[var(--warning)] border-white shadow-[0_0_20px_var(--warning)] animate-[pulse_2s_ease-in-out_infinite]'
              : 'bg-gray-300 border-gray-400 shadow-none'
        }`}
      >
        {isCompleted ? (
          <Check className="text-white" size={40} strokeWidth={4} />
        ) : isLocked ? (
          <Lock className="text-gray-500" size={32} />
        ) : (
          <span className="text-white font-bold text-3xl font-mono">{number}</span>
        )}
      </div>
      
      {/* Label */}
      <div className={`text-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 ${isLocked ? 'opacity-60' : ''}`}>
        <p className="font-bold text-[var(--text-primary)] text-sm">Chapter {number}</p>
        <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[120px] truncate">{title}</p>
      </div>
    </div>
  );
}
