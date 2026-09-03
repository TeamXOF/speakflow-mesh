interface WordChipProps {
  word: string;
  correct: boolean;
  phonemeMismatch: string | null;
  className?: string;
}

export default function WordChip({ word, correct, phonemeMismatch, className = "px-5 py-3 text-2xl" }: WordChipProps) {
  // correct: true -> Green
  let bgColorClass = 'bg-[var(--success)] border-green-600 text-white';
  
  if (!correct) {
    if (phonemeMismatch) {
      // correct: false + mismatch -> Red
      bgColorClass = 'bg-[var(--error)] border-red-600 text-white';
    } else {
      // correct: false + no mismatch -> Amber
      bgColorClass = 'bg-[var(--warning)] border-yellow-600 text-white';
    }
  }

  return (
    <span className={`${className} font-bold rounded-2xl border-b-4 shadow-md ${bgColorClass}`}>
      {word}
    </span>
  );
}
