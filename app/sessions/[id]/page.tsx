'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import WordChip from '@/components/Feedback/WordChip';
import AIFeedbackBubble from '@/components/Shared/AIFeedbackBubble';

const mockSession = {
  id: "sess_demo",
  studentName: "Ayaan Khan",
  date: "September 3, 2026 - 10:30 AM",
  duration: "12 mins",
  accuracy: 85,
  wpm: 62,
  engagement: "High",
  hesitation: {
    detected: true,
    afterWord: "explorer"
  },
  sentence: [
    { word: "the", correct: true, phoneme_mismatch: null },
    { word: "little", correct: true, phoneme_mismatch: null },
    { word: "explorer", correct: false, phoneme_mismatch: "x_vs_s" },
    { word: "climbed", correct: true, phoneme_mismatch: null },
    { word: "the", correct: false, phoneme_mismatch: null },
    { word: "steep", correct: false, phoneme_mismatch: null },
    { word: "mountain", correct: true, phoneme_mismatch: null },
  ],
  aiFeedback: "Try to pronounce 'explorer' a little slower. You did great on the other words!",
  recommendedPractice: ["explorer", "steep"]
};

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const session = mockSession; // hardcoded mock for Phase 8

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {/* Back Link */}
      <div>
        <Link 
          href="/sessions" 
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Sessions
        </Link>
      </div>

      {/* Header */}
      <div className="speakflow-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{session.studentName}</h1>
          <div className="flex items-center gap-4 text-[var(--text-secondary)] mt-2 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={16} /> {session.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={16} /> {session.duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Accuracy</p>
            <p className="text-3xl font-black text-[var(--success)]">{session.accuracy}%</p>
          </div>
          {/* Decorative circular ring for accuracy */}
          <div className="w-16 h-16 rounded-full border-[6px] border-[var(--success)]/20 border-t-[var(--success)] flex items-center justify-center transform -rotate-45">
             <div className="w-10 h-10 bg-[var(--success)]/10 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Word Analysis & Practice */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="speakflow-card p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Word Analysis</h3>
            <div className="flex flex-wrap gap-3 leading-loose pt-2">
              {session.sentence.map((w, idx) => (
                <WordChip
                  key={idx}
                  word={w.word}
                  correct={w.correct}
                  phonemeMismatch={w.phoneme_mismatch}
                  className="px-4 py-2 text-lg"
                />
              ))}
            </div>
          </div>
          
          <div className="speakflow-card p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Recommended Practice</h3>
            <div className="flex gap-3">
              {session.recommendedPractice.map((word, idx) => (
                <div key={idx} className="px-4 py-2 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-full">
                  <span className="font-bold text-[var(--text-primary)]">{word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Feedback & Overview */}
        <div className="flex flex-col gap-6">
          <div className="speakflow-card p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">AI Feedback</h3>
            <div className="bg-purple-50/50 -mx-6 -mb-6 p-6 rounded-b-2xl border-t border-[var(--border-color)]">
              <AIFeedbackBubble feedbackText={session.aiFeedback} />
            </div>
          </div>

          <div className="speakflow-card p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-[var(--text-secondary)] font-medium">Engagement</span>
                <span className="flex items-center gap-1.5 font-bold text-[var(--success)]">
                  <CheckCircle2 size={18} /> {session.engagement}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3 bg-[var(--warning)]/10 rounded-xl border border-[var(--warning)]/20">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-bold">Hesitation Detected</span>
                  <AlertTriangle size={18} className="text-[var(--warning)]" />
                </div>
                {session.hesitation.detected && (
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    Yes — paused after <span className="text-[var(--text-primary)] font-bold">"{session.hesitation.afterWord}"</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
