'use client';

import { useState } from 'react';
import { Volume2, Sparkles } from 'lucide-react';

interface PracticeSectionProps {
  word: string;
}

export default function PracticeSection({ word }: PracticeSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();

  const playAudio = (rate = 0.8) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.rate = rate;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const letters = cleanWord.split('');

  return (
    <div className="w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6 md:p-8 rounded-[36px] shadow-lg border-4 border-white flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-[var(--accent-primary)]" />
        <h3 className="text-lg md:text-xl font-black text-[var(--accent-secondary)] tracking-wide">
          Practice Tricky Word
        </h3>
      </div>
      
      {/* Big Word Card with Letter Tiles */}
      <div className="flex flex-col items-center gap-3 bg-white px-8 py-5 rounded-3xl border-2 border-purple-100 shadow-md">
        <div className="flex flex-wrap gap-2 justify-center">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="w-12 h-14 md:w-14 md:h-16 bg-gradient-to-b from-purple-50 to-purple-100 border-2 border-purple-300 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-black text-purple-900 shadow-sm transition-transform hover:scale-110"
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button 
            onClick={() => playAudio(0.8)}
            className={`px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[#B388FF] transition-all rounded-full text-white font-bold text-sm shadow-md active:scale-95 flex items-center gap-2 ${
              isPlaying ? 'ring-4 ring-purple-300' : ''
            }`}
            aria-label={`Play pronunciation of ${word}`}
          >
            <Volume2 size={20} />
            <span>{isPlaying ? 'Playing...' : 'Normal Speed'}</span>
          </button>

          <button 
            onClick={() => playAudio(0.5)}
            className="px-4 py-2.5 bg-purple-100 hover:bg-purple-200 transition-all rounded-full text-purple-800 font-bold text-xs shadow-sm active:scale-95 flex items-center gap-1.5"
            aria-label={`Play slow pronunciation of ${word}`}
          >
            <span>🐢 Slow Sound-Out</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center max-w-md">
        Listen closely to the sound of each letter, then say <strong className="text-purple-700">"{word}"</strong> aloud!
      </p>
    </div>
  );
}
