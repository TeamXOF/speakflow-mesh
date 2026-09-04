'use client';

import { ChevronRight } from 'lucide-react';

interface StrugglingWordsProps {
  words?: { word: string; misses: number }[];
}

export default function StrugglingWords({ words = [] }: StrugglingWordsProps) {
  return (
    <div className="speakflow-card p-6 shadow-sm flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Struggling Words</h3>
        <button className="text-[var(--accent-primary)] text-sm font-bold flex items-center hover:opacity-80 transition-opacity">
          View All <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-wrap content-start gap-3">
        {words.length > 0 ? words.map((item, idx) => (
          <div 
            key={idx} 
            className="px-4 py-2 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-full flex items-center gap-2"
          >
            <span className="font-bold text-[var(--text-primary)]">{item.word}</span>
            <span className="bg-white text-[var(--error)] text-xs font-bold px-2 py-0.5 rounded-full border border-[var(--error)]/20">
              {item.misses} misses
            </span>
          </div>
        )) : (
          <p className="text-[var(--text-secondary)]">No struggling words detected yet.</p>
        )}
      </div>
    </div>
  );
}
