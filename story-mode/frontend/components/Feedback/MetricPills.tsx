interface MetricPillsProps {
  accuracy: number;
  wpm: number;
  pauses: number;
}

function getPerformanceLabel(accuracy: number): string {
  if (accuracy >= 90) return 'Excellent! 🌟';
  if (accuracy >= 75) return 'Great Reading! 👍';
  if (accuracy >= 55) return 'Good Effort! 💪';
  if (accuracy >= 30) return 'Keep Practicing! 📚';
  return 'Needs More Practice 🎯';
}

export default function MetricPills({ accuracy, wpm, pauses }: MetricPillsProps) {
  return (
    <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border-[3px] border-gray-100 flex flex-col justify-center gap-4">
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{getPerformanceLabel(accuracy)}</h3>
      
      <div className="flex justify-between items-center text-lg">
        <span className="text-[var(--text-secondary)] font-medium">Accuracy</span>
        <span className="font-bold text-[var(--accent-primary)]">{accuracy}%</span>
      </div>
      
      <div className="flex justify-between items-center text-lg">
        <span className="text-[var(--text-secondary)] font-medium">Fluency</span>
        <span className="font-bold text-[var(--accent-primary)]">{wpm} WPM</span>
      </div>
      
      <div className="flex justify-between items-center text-lg">
        <span className="text-[var(--text-secondary)] font-medium">Pauses</span>
        <span className="font-bold text-[var(--accent-primary)]">{pauses}</span>
      </div>
    </div>
  );
}

