'use client';

import Link from 'next/link';
import { Search, BookOpen, ChevronRight } from 'lucide-react';

const DEMO_SESSIONS = [
  { id: "sess_demo", studentName: "Ayaan Khan", date: "Sept 3, 2026 - 10:30 AM", duration: "12 mins", accuracy: 85 },
  { id: "sess_002", studentName: "Fatima Ali", date: "Sept 2, 2026 - 02:15 PM", duration: "15 mins", accuracy: 92 },
  { id: "sess_003", studentName: "Zain Ahmed", date: "Sept 1, 2026 - 09:00 AM", duration: "10 mins", accuracy: 68 },
];

export default function SessionsPage() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Recent Sessions</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input 
            type="text" 
            placeholder="Search sessions..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>
      </div>

      <div className="speakflow-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-[var(--border-color)] bg-gray-50 font-medium text-[var(--text-secondary)] text-sm">
          <div>Student / Date</div>
          <div>Duration</div>
          <div>Accuracy</div>
          <div className="text-right">Action</div>
        </div>

        <div className="divide-y divide-[var(--border-color)]">
          {DEMO_SESSIONS.map(session => (
            <Link 
              href={`/sessions/${session.id}`} 
              key={session.id}
              className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div>
                <div className="font-bold text-[var(--text-primary)]">{session.studentName}</div>
                <div className="text-sm text-[var(--text-secondary)]">{session.date}</div>
              </div>
              <div className="text-[var(--text-secondary)] font-medium">
                {session.duration}
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  session.accuracy >= 80 
                    ? 'bg-[var(--success)]/10 text-[var(--success)]' 
                    : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                }`}>
                  {session.accuracy}%
                </span>
              </div>
              <div className="flex justify-end text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                <ChevronRight size={20} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
