'use client';
import { Star } from 'lucide-react';

export default function StarBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border-2 border-[var(--warning)] px-4 py-2 rounded-full shadow-lg">
      <Star className="text-[var(--warning)] fill-[var(--warning)]" size={24} />
      <span className="font-bold text-xl text-[var(--text-primary)]">{count}</span>
    </div>
  );
}
