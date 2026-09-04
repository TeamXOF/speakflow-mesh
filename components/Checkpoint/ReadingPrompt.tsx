export default function ReadingPrompt({ text, language }: { text: string; language?: 'en' | 'ur' }) {
  const isUrdu = language === 'ur';
  
  return (
    <div className="text-center max-w-4xl px-12 py-16 bg-white/70 backdrop-blur-xl rounded-[40px] border-4 border-white shadow-xl relative">
      <div className="absolute -top-6 -right-6 w-12 h-12 bg-[var(--accent-secondary)] rounded-full opacity-60"></div>
      <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[var(--success)] rounded-full opacity-40"></div>
      
      <h2 
        dir={isUrdu ? 'rtl' : 'ltr'} 
        className={`text-4xl md:text-5xl font-bold leading-tight text-[var(--text-primary)] ${isUrdu ? 'font-[var(--font-urdu)]' : ''}`}
      >
        "{text}"
      </h2>
      <p className="mt-8 text-2xl font-bold text-[var(--accent-primary)]">
        Take a deep breath and read aloud!
      </p>
    </div>
  );
}
