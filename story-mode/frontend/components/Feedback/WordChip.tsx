'use client';

import { AcousticDiagnostics, LetterDiff } from '@/lib/api';

interface WordChipProps {
  word: string;
  correct: boolean;
  phonemeMismatch?: string | null;
  transcribedWord?: string | null;
  acousticScore?: number;
  sttConfidence?: number;
  diagnostics?: AcousticDiagnostics | null;
  letterDiff?: LetterDiff[] | null;
  className?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function WordChip({ 
  word, 
  correct, 
  phonemeMismatch, 
  transcribedWord, 
  acousticScore = 0, 
  sttConfidence = 1.0,
  diagnostics,
  letterDiff,
  className = "px-5 py-3 text-2xl",
  isSelected = false,
  onSelect
}: WordChipProps) {
  const clean = (str?: string | null) => (str || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').toLowerCase().trim();

  const isSkipped = !correct && (phonemeMismatch === 'omitted' || !transcribedWord);
  const hasSpellingMismatch = Boolean(transcribedWord && clean(transcribedWord) !== clean(word));
  const isMispronounced = !correct && !isSkipped && hasSpellingMismatch;
  const isAcousticLow = !correct && !isSkipped && !hasSpellingMismatch;

  // Styling based on pronunciation status
  let bgColorClass = 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white shadow-md';
  let badgeText: string | null = null;
  let badgeColor = 'bg-white text-emerald-700 border-emerald-200';

  if (isSkipped) {
    bgColorClass = 'bg-slate-400 hover:bg-slate-500 border-slate-500 text-white opacity-85 shadow-sm';
    badgeText = 'Skipped';
    badgeColor = 'bg-slate-100 text-slate-600 border-slate-300';
  } else if (isMispronounced) {
    bgColorClass = 'bg-rose-500 hover:bg-rose-600 border-rose-600 text-white shadow-md';
    badgeText = `Said: "${transcribedWord}"`;
    badgeColor = 'bg-rose-100 text-rose-700 border-rose-300';
  } else if (isAcousticLow) {
    bgColorClass = 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-md';
    badgeText = 'Speak Louder';
    badgeColor = 'bg-amber-100 text-amber-700 border-amber-300';
  }

  const showSttWarning = sttConfidence < 0.5;

  return (
    <div className="group relative inline-block">
      <button 
        type="button"
        onClick={onSelect}
        className={`block ${className} font-bold rounded-2xl border-b-4 shadow-md ${bgColorClass} cursor-pointer transition-all hover:-translate-y-1 relative text-left focus:outline-none ${
          isSelected ? 'ring-4 ring-purple-500 ring-offset-2 scale-105 shadow-xl z-20' : ''
        }`}
      >
        <span>{word}</span>

        {/* Small subtitle badge indicating what was heard */}
        {badgeText && (
          <span className={`block text-[11px] font-semibold tracking-normal mt-0.5 px-2 py-0.5 rounded-full border shadow-sm ${badgeColor} max-w-[130px] truncate text-center`}>
            {badgeText}
          </span>
        )}

        {showSttWarning && (
          <span 
            className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs rounded-full border border-orange-200 w-6 h-6 flex items-center justify-center shadow-sm z-10" 
            title="Low Speech-to-Text Confidence"
          >
            ⚠️
          </span>
        )}
      </button>
      
      {/* Tooltip / Popover on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:flex flex-col items-center z-50 min-w-[280px] max-w-[340px] pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-sm rounded-2xl p-4 shadow-2xl w-full border border-slate-700">
          
          <div className="flex justify-between border-b border-slate-700/80 pb-2 mb-2 items-center">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Expected</span>
            <span className="font-bold text-emerald-300 text-lg">{word}</span>
          </div>
          
          <div className="flex justify-between border-b border-slate-700/80 pb-2 mb-2 items-center">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Heard</span>
            {letterDiff && letterDiff.length > 0 ? (
              <span className="font-mono font-bold tracking-widest text-base bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {letterDiff.map((diff, i) => {
                  if (diff.type === 'match' || diff.type === 'equal') {
                    return <span key={i} className="text-emerald-400">{diff.heard || diff.expected}</span>;
                  }
                  if (diff.type === 'replace') {
                    return (
                      <span key={i} className="text-rose-400 font-black border-b-2 border-rose-500 bg-rose-500/20 px-0.5 rounded">
                        {diff.heard}
                      </span>
                    );
                  }
                  if (diff.type === 'delete') {
                    return <span key={i} className="text-slate-500 line-through text-xs px-0.5">{diff.expected}</span>;
                  }
                  if (diff.type === 'insert') {
                    return <span key={i} className="text-amber-400 font-bold border-b-2 border-amber-500 px-0.5">{diff.heard}</span>;
                  }
                  return null;
                })}
              </span>
            ) : (
              <span className={`font-bold ${isSkipped ? 'text-slate-400 italic' : 'text-amber-300'}`}>
                {transcribedWord || 'Skipped (not spoken)'}
              </span>
            )}
          </div>

          {/* Explicit Child-friendly Pronunciation Message */}
          {isMispronounced && transcribedWord && hasSpellingMismatch && (
            <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-2.5 mb-2.5 text-xs text-rose-200">
              You said <strong className="text-rose-300">"{transcribedWord}"</strong>, but the word is <strong className="text-emerald-300">"{word}"</strong>.
            </div>
          )}

          {isAcousticLow && (
            <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-2.5 mb-2.5 text-xs text-amber-200">
              We heard <strong className="text-amber-300">"{clean(word)}"</strong>! Try speaking slightly louder.
            </div>
          )}

          {isSkipped && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 mb-2.5 text-xs text-slate-300">
              This word was skipped completely.
            </div>
          )}
          
          <div className="flex justify-between border-b border-slate-700/80 pb-2 mb-2 items-center">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Acoustic Score</span>
            <span className={`font-mono font-bold text-sm ${acousticScore >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {Math.round(acousticScore)}%
            </span>
          </div>

          {diagnostics && (
            <div className="mt-2 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1.5">Acoustic Metrics</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px]">Voice Clarity</span>
                  <span className="font-mono font-bold text-slate-200">{diagnostics.clarity_score}/100</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px]">Volume</span>
                  <span className="font-mono font-bold text-slate-200">{diagnostics.loudness_score}/100</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-purple-300 text-center mt-2.5 font-medium">
            💡 Click chip to view letter-by-letter breakdown below
          </div>
          
        </div>
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-slate-900 border-r-[8px] border-r-transparent"></div>
      </div>
    </div>
  );
}
