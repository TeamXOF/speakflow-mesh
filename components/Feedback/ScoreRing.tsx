export default function ScoreRing({ score }: { score: number }) {
  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border-[3px] border-gray-100 flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg width="150" height="150" className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="#F3F4F6" // Gray-100
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress ring */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="var(--success)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold text-[var(--text-primary)]">{score}%</span>
        </div>
      </div>
    </div>
  );
}
