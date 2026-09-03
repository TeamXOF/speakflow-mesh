'use client';

import { ChevronDown } from 'lucide-react';

const DEMO_PROGRESS = [
  { id: 1, name: "The Brave Little Rabbit", accuracy: 98, completed: 25, total: 28 },
  { id: 2, name: "Climbing the Mountain", accuracy: 72, completed: 23, total: 28 },
  { id: 3, name: "Lost in the Forest", accuracy: 68, completed: 18, total: 28 },
  { id: 4, name: "The Hidden Treasure", accuracy: 60, completed: 15, total: 28 },
  { id: 5, name: "The Big Celebration", accuracy: 0, completed: 0, total: 28 },
];

export default function ProgressPage() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Checkpoint Overview</h1>
        
        {/* Mock Filter Dropdown */}
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
              <th className="p-4 font-medium">Checkpoint</th>
              <th className="p-4 font-medium w-48 text-right">Avg. Accuracy</th>
              <th className="p-4 font-medium w-72">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {DEMO_PROGRESS.map((item) => {
              const completionPercentage = (item.completed / item.total) * 100;
              
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
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
