'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { fetchAllSessions } from '@/lib/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllSessions().then(data => setSessions(data)).catch(console.error);
  }, []);

  const filtered = sessions.filter(s =>
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Recent Sessions</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input
            type="text"
            placeholder="Search by student ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="speakflow-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-[var(--border-color)] bg-gray-50 font-medium text-[var(--text-secondary)] text-sm">
          <div>Student / Date</div>
          <div>WPM</div>
          <div>Accuracy</div>
          <div className="text-right">Action</div>
        </div>

        <div className="divide-y divide-[var(--border-color)]">
          {filtered.length > 0 ? filtered.map(session => {
            const accuracy = session.total_words > 0
              ? Math.round((session.correct_words / session.total_words) * 100)
              : 0;
            return (
              <Link
                href={`/sessions/${session.id}`}
                key={session.id}
                className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-[var(--text-primary)]">{session.student_id}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {new Date(session.local_created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-[var(--text-secondary)] font-medium">
                  {Math.round(session.wpm)} WPM
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    accuracy >= 80
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                  }`}>
                    {accuracy}%
                  </span>
                </div>
                <div className="flex justify-end text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  <ChevronRight size={20} />
                </div>
              </Link>
            );
          }) : (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              No sessions found. Complete a reading session first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

