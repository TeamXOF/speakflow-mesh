'use client';

import { Volume2 } from 'lucide-react';

interface PracticeSectionProps {
  word: string;
}

export default function PracticeSection({ word }: PracticeSectionProps) {
  const playAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8; // Speak slightly slower for practice
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-3xl shadow-sm border-[3px] border-gray-100 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h3 className="text-xl font-bold text-[var(--text-secondary)]">Let's Practice Together</h3>
      
      <div className="flex items-center gap-4 bg-gray-50 px-8 py-4 rounded-full border-2 border-gray-100 shadow-inner">
        <span className="text-4xl font-black text-[var(--text-primary)]">{word}</span>
        
        <button 
          onClick={playAudio}
          className="p-3 bg-[var(--accent-primary)] hover:bg-[#B388FF] transition-colors rounded-full text-white shadow-md active:scale-95"
          aria-label={`Play pronunciation of ${word}`}
        >
          <Volume2 size={28} />
        </button>
      </div>
    </div>
  );
}
