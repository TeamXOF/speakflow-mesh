'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import WordChip from '@/components/Feedback/WordChip';
import AIFeedbackBubble from '@/components/Shared/AIFeedbackBubble';
import { fetchSession } from '@/lib/api';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession(resolvedParams.id).then(data => {
      setSession(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <Link href="/sessions" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors">
          <ArrowLeft size={20} /> Back to Sessions
        </Link>
        <div className="speakflow-card p-8 text-center text-[var(--text-secondary)]">
          Session not found or has no data yet.
        </div>
      </div>
    );
  }

  const accuracy = session.total_words > 0
    ? Math.round((session.correct_words / session.total_words) * 100)
    : 0;

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
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{session.student_id}</h1>
          <div className="flex items-center gap-4 text-[var(--text-secondary)] mt-2 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={16} /> {new Date(session.local_created_at).toLocaleString()}</span>
            <span className="flex items-center gap-1.5"><Clock size={16} /> {Math.round(session.wpm)} WPM</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Accuracy</p>
            <p className={`text-3xl font-black ${accuracy >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{accuracy}%</p>
          </div>
          <div className="w-16 h-16 rounded-full border-[6px] border-[var(--success)]/20 border-t-[var(--success)] flex items-center justify-center transform -rotate-45">
            <div className="w-10 h-10 bg-[var(--success)]/10 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Checkpoints */}
      {session.checkpoints && session.checkpoints.length > 0 ? (
        session.checkpoints.map((cp: any, idx: number) => (
          <div key={cp.checkpoint_id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="speakflow-card p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Checkpoint {idx + 1}
                    <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">({cp.checkpoint_id})</span>
                  </h3>
                  <div className="flex gap-2">
                    {cp.stt_source && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        cp.stt_source === 'groq'
                          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                          : 'bg-[var(--warning)]/20 text-[var(--warning)]'
                      }`}>
                        {cp.stt_source === 'groq' ? 'Groq' : 'Offline'}
                      </span>
                    )}
                    {cp.feedback_source && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        cp.feedback_source === 'gemini'
                          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                          : 'bg-[var(--warning)]/20 text-[var(--warning)]'
                      }`}>
                        {cp.feedback_source === 'gemini' ? 'Gemini' : 'Template'}
                      </span>
                    )}
                  </div>
                </div>
                {cp.transcript && (
                  <p className="text-sm text-[var(--text-secondary)] mb-4 italic">"{cp.transcript}"</p>
                )}
                {cp.words && cp.words.length > 0 ? (
                  <div className="flex flex-wrap gap-3 leading-loose pt-2">
                    {cp.words.map((w: any, widx: number) => (
                      <WordChip
                        key={widx}
                        word={w.word}
                        correct={!!w.correct}
                        phonemeMismatch={w.phoneme_mismatch}
                        className="px-4 py-2 text-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No word data recorded for this checkpoint.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="speakflow-card p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">AI Feedback</h3>
                <div className="bg-purple-50/50 -mx-6 -mb-6 p-6 rounded-b-2xl border-t border-[var(--border-color)]">
                  <AIFeedbackBubble feedbackText={cp.feedback_text || 'Feedback not yet available.'} />
                </div>
              </div>
              {cp.engagement_state && (
                <div className="speakflow-card p-6">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Engagement</h3>
                  <span className="flex items-center gap-1.5 font-bold text-[var(--success)]">
                    <CheckCircle2 size={18} /> {cp.engagement_state}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="speakflow-card p-8 text-center text-[var(--text-secondary)]">
          No checkpoint data yet. Try completing a reading session.
        </div>
      )}
    </div>
  );
}

