import WordChip from './WordChip';

interface Word {
  word: string;
  correct: boolean;
  phoneme_mismatch: string | null;
}

export default function WordAnalysis({ words, language }: { words: Word[]; language?: 'en' | 'ur' }) {
  const isUrdu = language === 'ur';
  return (
    <div className="w-full max-w-4xl bg-white/90 backdrop-blur-md p-10 rounded-[40px] border-4 border-white shadow-xl relative">
      <h3 className="text-xl font-black text-[var(--accent-secondary)] mb-8 text-center uppercase tracking-widest bg-purple-50 inline-block px-6 py-2 rounded-full absolute -top-6 left-1/2 transform -translate-x-1/2 border-4 border-white">
        Word by Word
      </h3>
      <div 
        dir={isUrdu ? 'rtl' : 'ltr'}
        className={`flex flex-wrap gap-4 justify-center items-center leading-loose pt-4 ${isUrdu ? 'font-[var(--font-urdu)]' : ''}`}
      >
        {words.map((w, idx) => (
          <WordChip
            key={idx}
            word={w.word}
            correct={w.correct}
            phonemeMismatch={w.phoneme_mismatch}
          />
        ))}
      </div>
    </div>
  );
}
