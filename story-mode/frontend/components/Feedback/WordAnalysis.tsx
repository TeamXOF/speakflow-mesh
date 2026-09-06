'use client';

import { useState } from 'react';
import WordChip from './WordChip';
import { Phase1Response, WordResult } from '@/lib/api';
import { Volume2, CheckCircle2, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';

interface WordAnalysisProps {
  words: WordResult[];
  language?: 'en' | 'ur';
  phase1Result?: Phase1Response | null;
}

export default function WordAnalysis({ words, language = 'en', phase1Result }: WordAnalysisProps) {
  const isUrdu = language === 'ur';

  // Find index of first incorrect word to auto-select, or default to 0
  const firstProblemIdx = words.findIndex(w => !w.correct);
  const [selectedWordIdx, setSelectedWordIdx] = useState<number>(() => (firstProblemIdx !== -1 ? firstProblemIdx : 0));

  const selectedWord = words[selectedWordIdx] || words[0];

  const playAudio = (wordToSpeak: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToSpeak);
      utterance.lang = isUrdu ? 'ur-PK' : 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const cleanWord = (w?: string | null) => (w || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').toLowerCase().trim();

  const isSkipped = Boolean(
    selectedWord && 
    !selectedWord.correct && 
    (selectedWord.phoneme_mismatch === 'omitted' || !selectedWord.transcribed_word)
  );

  const hasSpellingMismatch = Boolean(
    selectedWord &&
    selectedWord.transcribed_word &&
    cleanWord(selectedWord.transcribed_word) !== cleanWord(selectedWord.word)
  );

  const isMispronounced = Boolean(
    selectedWord && 
    !selectedWord.correct && 
    !isSkipped && 
    hasSpellingMismatch
  );

  const isAcousticLow = Boolean(
    selectedWord && 
    !selectedWord.correct && 
    !isSkipped && 
    !hasSpellingMismatch
  );

  return (
    <div className="w-full max-w-4xl bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-[36px] border-4 border-white shadow-xl relative flex flex-col gap-8">
      
      {/* Title Header */}
      <div className="flex justify-center">
        <h3 className="text-lg md:text-xl font-black text-[var(--accent-secondary)] uppercase tracking-widest bg-purple-50 inline-flex items-center gap-2 px-6 py-2 rounded-full absolute -top-5 left-1/2 transform -translate-x-1/2 border-4 border-white shadow-sm">
          <Sparkles size={18} className="text-[var(--accent-primary)]" />
          Word-by-Word Feedback
        </h3>
      </div>

      {/* Sentence Word Chips */}
      <div 
        dir={isUrdu ? 'rtl' : 'ltr'}
        className={`flex flex-wrap gap-3.5 justify-center items-center leading-loose pt-2 ${isUrdu ? 'font-[var(--font-urdu)]' : ''}`}
      >
        {words.map((w, idx) => (
          <WordChip
            key={idx}
            word={w.word}
            correct={w.correct}
            phonemeMismatch={w.phoneme_mismatch}
            transcribedWord={w.transcribed_word}
            acousticScore={w.acoustic_score || 0}
            sttConfidence={w.stt_confidence}
            diagnostics={w.diagnostics}
            letterDiff={w.letter_diff}
            isSelected={idx === selectedWordIdx}
            onSelect={() => setSelectedWordIdx(idx)}
          />
        ))}
      </div>

      {/* ========================================================================= */}
      {/* PROMINENT LETTER-BY-LETTER PRONUNCIATION WORKBENCH                        */}
      {/* ========================================================================= */}
      {selectedWord && (
        <div className="mt-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-indigo-900/60 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top Bar: Word Navigator Pills */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700/80 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <span>🔍 Letter-by-Letter Inspector</span>
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Click any word to inspect exact letters and acoustics</p>
            </div>

            {/* Quick Word Selector Track */}
            <div className="flex flex-wrap gap-1.5 max-w-full">
              {words.map((w, idx) => {
                const active = idx === selectedWordIdx;
                const err = !w.correct;
                const isSkippedWord = !w.correct && (w.phoneme_mismatch === 'omitted' || !w.transcribed_word);
                const hasMismatch = Boolean(w.transcribed_word && cleanWord(w.transcribed_word) !== cleanWord(w.word));
                const isAcousticLowWord = !w.correct && !isSkippedWord && !hasMismatch;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedWordIdx(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      active 
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400' 
                        : err 
                          ? isAcousticLowWord
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800 hover:bg-amber-900'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800 hover:bg-rose-900' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>{w.word}</span>
                    {w.correct ? (
                      <span className="text-[10px] text-emerald-400">✓</span>
                    ) : isAcousticLowWord ? (
                      <span className="text-[10px] text-amber-400">~</span>
                    ) : (
                      <span className="text-[10px] text-rose-400">❌</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Word Main Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-semibold">Target Word</span>
                <span className="text-3xl md:text-4xl font-black text-white tracking-wide">{selectedWord.word}</span>
              </div>

              <button
                onClick={() => playAudio(selectedWord.word)}
                className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                title={`Listen to pronunciation of ${selectedWord.word}`}
              >
                <Volume2 size={22} />
                <span className="text-xs font-bold pr-1 hidden sm:inline">Listen</span>
              </button>
            </div>

            {/* Status Pill */}
            <div>
              {selectedWord.correct ? (
                <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/80 px-4 py-2 rounded-xl text-emerald-300">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <span className="font-bold text-sm">Pronounced Correctly</span>
                </div>
              ) : isSkipped ? (
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl text-slate-200">
                  <HelpCircle size={20} className="text-slate-400" />
                  <span className="font-bold text-sm">Word Skipped</span>
                </div>
              ) : isMispronounced ? (
                <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-700/80 px-4 py-2 rounded-xl text-rose-200">
                  <AlertCircle size={20} className="text-rose-400" />
                  <span className="font-bold text-sm">
                    Mispronounced: Heard "{selectedWord.transcribed_word}"
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-700/80 px-4 py-2 rounded-xl text-amber-200">
                  <AlertCircle size={20} className="text-amber-400" />
                  <span className="font-bold text-sm">Voice Volume / Clarity Low</span>
                </div>
              )}
            </div>
          </div>

          {/* Actionable Human Guidance Sentence */}
          {isMispronounced && selectedWord.transcribed_word && hasSpellingMismatch && (
            <div className="bg-rose-950/60 border-2 border-rose-600/60 p-4 rounded-2xl flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <p className="text-sm md:text-base text-rose-100 leading-snug">
                You said <strong className="text-rose-300 font-extrabold text-lg underline">"{selectedWord.transcribed_word}"</strong>, 
                but the expected word is <strong className="text-emerald-300 font-extrabold text-lg">"{selectedWord.word}"</strong>.
              </p>
            </div>
          )}

          {isAcousticLow && (
            <div className="bg-amber-950/60 border-2 border-amber-600/60 p-4 rounded-2xl flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <p className="text-sm md:text-base text-amber-100 leading-snug">
                Good effort! We heard <strong className="text-emerald-300 font-extrabold text-lg">"{cleanWord(selectedWord.word)}"</strong>, but try speaking slightly louder and closer to the microphone.
              </p>
            </div>
          )}

          {isSkipped && (
            <div className="bg-slate-800/80 border-2 border-slate-600/70 p-4 rounded-2xl flex items-center gap-3">
              <span className="text-2xl">⚪</span>
              <p className="text-sm md:text-base text-slate-200 leading-snug">
                You skipped <strong className="text-amber-300 font-extrabold">"{selectedWord.word}"</strong>. 
                Press the <strong>Listen</strong> button above, listen to the pronunciation, and speak the word on your next try!
              </p>
            </div>
          )}

          {/* Letter Diff Comparison Grid */}
          {selectedWord.letter_diff && selectedWord.letter_diff.length > 0 && isMispronounced ? (
            <div className="bg-slate-950/90 rounded-2xl p-5 md:p-6 border border-slate-800 flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Letter-by-Letter Analysis
              </span>

              {/* Visual Letter Rows */}
              <div className="grid grid-cols-1 gap-4">
                
                {/* Row 1: Target Word Letters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="w-24 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Target:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedWord.letter_diff.map((diff, i) => {
                      const isMatch = diff.type === 'match' || diff.type === 'equal';
                      const isReplace = diff.type === 'replace';
                      const isDel = diff.type === 'delete';

                      if (isMatch) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-emerald-600/30 border-2 border-emerald-500 rounded-xl flex items-center justify-center font-mono font-bold text-xl md:text-2xl text-emerald-300 shadow-sm">
                              {diff.expected}
                            </span>
                            <span className="text-[10px] text-emerald-400 mt-1">✓ match</span>
                          </div>
                        );
                      }

                      if (isReplace) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-rose-600/40 border-2 border-rose-500 rounded-xl flex items-center justify-center font-mono font-black text-xl md:text-2xl text-rose-200 shadow-md ring-2 ring-rose-500/50 animate-pulse">
                              {diff.expected}
                            </span>
                            <span className="text-[10px] text-rose-400 font-bold mt-1">Expected</span>
                          </div>
                        );
                      }

                      if (isDel) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-slate-800 border-2 border-slate-600 rounded-xl flex items-center justify-center font-mono font-bold text-xl md:text-2xl text-slate-500 line-through">
                              {diff.expected}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">Omitted</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>

                {/* Row 2: What Was Heard Letters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 border-t border-slate-800">
                  <span className="w-24 text-xs font-bold uppercase tracking-wider text-slate-400">
                    You Said:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedWord.letter_diff.map((diff, i) => {
                      const isMatch = diff.type === 'match' || diff.type === 'equal';
                      const isReplace = diff.type === 'replace';
                      const isIns = diff.type === 'insert';

                      if (isMatch) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-emerald-600/20 border-2 border-emerald-500/70 rounded-xl flex items-center justify-center font-mono font-bold text-xl md:text-2xl text-emerald-300">
                              {diff.heard || diff.expected}
                            </span>
                            <span className="text-[10px] text-emerald-400 mt-1">Correct</span>
                          </div>
                        );
                      }

                      if (isReplace) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-rose-900/60 border-2 border-rose-500 rounded-xl flex items-center justify-center font-mono font-black text-xl md:text-2xl text-rose-300 shadow-md">
                              {diff.heard}
                            </span>
                            <span className="text-[10px] text-rose-300 font-extrabold mt-1">Heard</span>
                          </div>
                        );
                      }

                      if (isIns) {
                        return (
                          <div key={i} className="flex flex-col items-center">
                            <span className="w-10 h-12 md:w-12 md:h-14 bg-amber-900/40 border-2 border-amber-500 rounded-xl flex items-center justify-center font-mono font-bold text-xl md:text-2xl text-amber-300">
                              {diff.heard}
                            </span>
                            <span className="text-[10px] text-amber-400 mt-1">Extra</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>

              </div>
            </div>
          ) : !selectedWord.correct && isAcousticLow ? (
            <div className="bg-slate-950/60 p-4 rounded-xl text-xs text-slate-300">
              The spelling of this word matched! Acoustic features (vocal clarity or volume) were slightly below target.
            </div>
          ) : null}

          {/* Diagnostics Meter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Acoustic Score</span>
              <span className={`font-mono font-bold text-base ${selectedWord.acoustic_score >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Math.round(selectedWord.acoustic_score || 0)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Voice Clarity</span>
              <span className="font-mono font-bold text-base text-purple-300">
                {selectedWord.diagnostics?.clarity_score !== undefined ? `${selectedWord.diagnostics.clarity_score}/100` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Voice Volume</span>
              <span className="font-mono font-bold text-base text-blue-300">
                {selectedWord.diagnostics?.loudness_score !== undefined ? `${selectedWord.diagnostics.loudness_score}/100` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">STT Confidence</span>
              <span className="font-mono font-bold text-base text-emerald-300">
                {Math.round((selectedWord.stt_confidence || 1.0) * 100)}%
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Diagnostics Latency & Hesitations Dashboard */}
      {phase1Result && (
        <div className="mt-2 pt-6 border-t-2 border-dashed border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-slate-500 font-bold text-xs uppercase mb-2 tracking-wider">Processing Latency</h4>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-slate-600">Speech-to-Text:</span>
              <span className="font-mono font-bold text-slate-800">{phase1Result.latency_ms?.stt || 0}ms</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-slate-600">Acoustic Scoring:</span>
              <span className="font-mono font-bold text-slate-800">{phase1Result.latency_ms?.acoustic || 0}ms</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Speaking Rate:</span>
              <span className="font-mono font-bold text-slate-800">{phase1Result.wpm || 0} wpm</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-slate-500 font-bold text-xs uppercase mb-2 tracking-wider">Pacing & Hesitations</h4>
            <div className="flex justify-between items-center text-sm mb-2 pb-2 border-b border-slate-200">
              <span className="text-slate-600">Total Hesitations:</span>
              <span className="font-mono font-bold text-slate-800">{phase1Result.hesitations?.length || 0}</span>
            </div>
            
            {phase1Result.hesitations && phase1Result.hesitations.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                {phase1Result.hesitations.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">After '{h.after_word}'</span>
                    <span className={`font-mono font-bold ${h.flagged_ambiguous ? 'text-red-500' : 'text-amber-500'}`}>
                      +{h.pause_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No significant pauses detected.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
