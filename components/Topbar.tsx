'use client';

import { Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function Topbar() {
  const today = format(new Date(), 'MMMM d, yyyy');

  return (
    <header className="h-[72px] bg-[var(--bg-base)] px-8 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold">Good morning, Teacher!</h2>
        <p className="text-[var(--text-secondary)] text-sm">Here's what's happening today.</p>
      </div>
      <div className="flex items-center gap-6">
        <span className="font-mono text-sm text-[var(--text-secondary)]">{today}</span>
        <button className="p-2 rounded-full hover:bg-gray-200 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--error)] rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
