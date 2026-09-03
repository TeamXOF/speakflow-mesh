import { Star, Shield, ArrowRight } from 'lucide-react';
import MascotMessage from '@/components/Feedback/MascotMessage';

interface RewardsScreenProps {
  checkpointNum: number;
  totalCheckpoints: number;
  onContinue: () => void;
}

export default function RewardsScreen({ checkpointNum, totalCheckpoints, onContinue }: RewardsScreenProps) {
  return (
    <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 pb-16 gap-10 animate-in fade-in zoom-in-95 duration-500 ease-out">
      
      {/* Mascot & Celebration Header */}
      <div className="w-full text-center">
        <MascotMessage message="Awesome!" />
        <h3 className="text-2xl font-bold text-[var(--text-secondary)] mt-4">
          You completed Checkpoint {checkpointNum}
        </h3>
      </div>
      
      {/* Progress Indicator */}
      <div className="flex flex-col items-center gap-4 w-full">
        <span className="font-bold text-[var(--text-secondary)]">
          Your Progress &mdash; {checkpointNum} / {totalCheckpoints}
        </span>
        <div className="flex gap-3">
          {Array.from({ length: totalCheckpoints }).map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-500 ${
                i < checkpointNum 
                  ? "bg-[var(--success)] shadow-md" 
                  : "bg-gray-200"
              }`} 
            />
          ))}
        </div>
      </div>
      
      {/* Rewards Cards */}
      <div className="flex gap-6 w-full justify-center">
        {/* Stars Reward */}
        <div className="bg-white px-8 py-6 rounded-3xl shadow-md border-2 border-[#FDD835]/30 flex flex-col items-center gap-2 animate-[bounce_2s_infinite]">
          <Star size={40} className="text-[#FDD835] fill-[#FDD835]" />
          <span className="text-2xl font-black text-[var(--text-primary)]">+10 Stars</span>
        </div>
        
        {/* Badge Reward */}
        <div className="bg-white px-8 py-6 rounded-3xl shadow-md border-2 border-[#64B5F6]/30 flex flex-col items-center gap-2 animate-[bounce_2s_infinite_0.5s]">
          <Shield size={40} className="text-[#64B5F6] fill-[#64B5F6]" />
          <span className="text-2xl font-black text-[var(--text-primary)]">+1 Badge</span>
        </div>
      </div>
      
      {/* Continue Adventure Button */}
      <div className="mt-8">
        <button 
          onClick={onContinue}
          className="flex items-center gap-3 px-10 py-5 font-bold text-2xl text-white bg-[var(--accent-primary)] rounded-full border-b-[6px] border-[#9B8AF0] hover:bg-[#B388FF] hover:-translate-y-1 active:translate-y-0 active:border-b-0 transition-all shadow-lg"
        >
          Continue Adventure
          <ArrowRight size={28} strokeWidth={3} />
        </button>
      </div>
      
    </main>
  );
}
