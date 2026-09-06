'use client';

import { useReadingSession } from '@/contexts/ReadingSessionContext';
import StarBadge from '@/components/ChapterMap/StarBadge';
import MapNode from '@/components/ChapterMap/MapNode';

export default function StoryMapPage() {
  const { totalStars, chapters, startChapter, language, setLanguage } = useReadingSession();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-sky-200 font-sans">
      {/* Background Decor - Nature Scene */}
      <div className="absolute bottom-0 w-full h-[50vh] bg-green-400 rounded-t-[50%_20%]" />
      <div className="absolute bottom-0 w-full h-[35vh] bg-green-500 rounded-t-[30%_50%]" />
      
      {/* Clouds */}
      <div className="absolute top-24 left-[10%] w-32 h-12 bg-white/80 rounded-full blur-[2px]" />
      <div className="absolute top-16 right-[20%] w-48 h-16 bg-white/70 rounded-full blur-[2px]" />
      <div className="absolute top-40 right-[10%] w-24 h-10 bg-white/60 rounded-full blur-[1px]" />

      {/* Header and Badge */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-start z-20">
        <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Your Journey</h1>
          <p className="text-[var(--text-secondary)] font-medium">Choose a chapter to continue</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg border border-gray-200 flex">
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                language === 'en' 
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-gray-100'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ur')}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all font-[var(--font-urdu)] ${
                language === 'ur' 
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-gray-100'
              }`}
            >
              اردو
            </button>
          </div>
          <StarBadge count={totalStars} />
        </div>
      </div>

      {/* Map Nodes Container */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="relative w-full max-w-4xl h-[600px] pointer-events-auto">
          
          {/* Chapter 1 */}
          <div className="absolute left-[15%] bottom-[15%]">
            <MapNode 
              number={1} 
              id={chapters[0].id}
              title={chapters[0].title}
              status={chapters[0].status}
              onClick={() => startChapter(chapters[0].id)}
            />
          </div>

          {/* Chapter 2 */}
          <div className="absolute left-[45%] bottom-[45%]">
            <MapNode 
              number={2} 
              id={chapters[1].id}
              title={chapters[1].title}
              status={chapters[1].status}
              onClick={() => startChapter(chapters[1].id)}
            />
          </div>

          {/* Chapter 3 */}
          <div className="absolute left-[75%] top-[15%]">
            <MapNode 
              number={3} 
              id={chapters[2].id}
              title={chapters[2].title}
              status={chapters[2].status}
              onClick={() => startChapter(chapters[2].id)}
            />
          </div>
          
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 w-full flex justify-center z-20">
        <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-gray-200 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[var(--success)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[var(--warning)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-300" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
