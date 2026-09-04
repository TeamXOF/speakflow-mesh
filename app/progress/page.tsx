'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchAllSessions } from '@/lib/api';

const STORY_NAMES: Record<string, string> = {
  "forest_adventure": "The Brave Little Rabbit",
  "mountain_climb": "Climbing the Mountain",
  "hidden_treasure": "The Hidden Treasure",
  "forest_lost": "Lost in the Forest",
  "celebration": "The Big Celebration",
};

export default function ProgressPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchAllSessions().then(data => setSessions(data)).catch(console.error);
  }, []);

  interface StoryStats { total_words: number; correct_words: number; count: number; }
  // Group sessions by story_id and compute aggregate stats
  const storyMap = sessions.reduce<Record<string, StoryStats>>((acc, s) => {
    const key = s.story_id as string;
    if (!acc[key]) acc[key] = { total_words: 0, correct_words: 0, count: 0 };
    acc[key].total_words += (s.total_words as number);
    acc[key].correct_words += (s.correct_words as number);
    acc[key].count += 1;
    return acc;
  }, {});

  const progressItems = (Object.entries(storyMap) as [string, StoryStats][]).map(([storyId, data], idx) => ({
    id: idx + 1,
    storyId,
    name: STORY_NAMES[storyId] || storyId,
    accuracy: data.total_words > 0 ? Math.round((data.correct_words / data.total_words) * 100) : 0,
    completed: data.count,
    total: 5,
  }));

  const displayItems = progressItems.length > 0 ? progressItems : [
    { id: 1, storyId: "", name: "No sessions yet", accuracy: 0, completed: 0, total: 5 }
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Checkpoint Overview</h1>

        <div className="relative">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-gray-50 transition-colors shadow-sm">
            All Students
            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="speakflow-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)]">
              <th className="p-4 font-medium w-16 text-center">#</th>
              <th className="p-4 font-medium">Story / Checkpoint</th>
              <th className="p-4 font-medium w-48 text-right">Avg. Accuracy</th>
              <th className="p-4 font-medium w-72">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {displayItems.map((item) => {
              const completionPercentage = Math.min((item.completed / item.total) * 100, 100);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-center font-bold text-[var(--text-secondary)]">
                    {item.id}
                  </td>
                  <td className="p-4 font-bold text-[var(--text-primary)]">
                    {item.name}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
                      item.accuracy >= 80
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : item.accuracy > 0
                        ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {item.accuracy}%
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm font-medium w-12 text-right text-[var(--text-secondary)]">
                        {item.completed}/{item.total}
                      </div>
                      <div className="flex-1 h-3 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]/10">
                        <div
                          className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

