import { Star } from 'lucide-react';

interface AIFeedbackBubbleProps {
  feedbackText: string;
}

export default function AIFeedbackBubble({ feedbackText }: AIFeedbackBubbleProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 relative w-full pt-4">
      <div className="relative mt-2">
        {/* Decorative Floating Stars with Twinkle Animation */}
        <div className="absolute -left-16 -top-4 animate-[pulse_3s_ease-in-out_infinite]">
          <Star size={48} className="text-[#FDD835] fill-[#FDD835] transform -rotate-12 drop-shadow-md" strokeWidth={1} />
        </div>
        <div className="absolute -right-12 top-6 animate-[pulse_2s_ease-in-out_infinite_1s]">
          <Star size={32} className="text-[#FDD835] fill-[#FDD835] transform rotate-45 drop-shadow-md" strokeWidth={1} />
        </div>
        
        {/* Confetti Dots */}
        <div className="w-3 h-3 rounded-full bg-blue-200 absolute -left-10 top-16 animate-[pulse_4s_ease-in-out_infinite_0.5s]" />
        <div className="w-3 h-3 rounded-full bg-[#E1BEE7] absolute -right-4 -top-2 animate-[pulse_3s_ease-in-out_infinite_1.5s]" />
        <div className="w-2 h-2 rounded-full bg-gray-200 absolute left-12 -bottom-2 animate-[pulse_2s_ease-in-out_infinite]" />
        
        {/* Mascot - 2D Illustration that looks 3D */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
              <defs>
                <radialGradient id="star-3d" cx="35%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#E6D4FF" />
                  <stop offset="50%" stopColor="#C9BFF0" />
                  <stop offset="100%" stopColor="#9B8AF0" />
                </radialGradient>
                <filter id="inner-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
                  <feFlood floodColor="white" floodOpacity="0.4" />
                  <feComposite in2="shadowDiff" operator="in" />
                  <feComposite in2="SourceGraphic" operator="over" />
                </filter>
              </defs>
              <path 
                d="M50 15 L61 38 L86 42 L68 60 L72 85 L50 73 L28 85 L32 60 L14 42 L39 38 Z" 
                fill="url(#star-3d)"
                stroke="url(#star-3d)"
                strokeWidth="10"
                strokeLinejoin="round"
                filter="url(#inner-glow)"
              />
            </svg>
            
            {/* Cute Face Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
              <div className="flex gap-4">
                <div className="relative w-2 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="absolute top-[1px] right-[1px] w-1 h-1 bg-white rounded-full"></div>
                </div>
                <div className="relative w-2 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="absolute top-[1px] right-[1px] w-1 h-1 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="w-4 h-2 border-b-[2.5px] border-gray-800 rounded-b-full mt-1"></div>
              <div className="absolute top-[56px] left-[34px] w-3 h-2 bg-[#F48FB1] rounded-full opacity-80 blur-[1px]"></div>
              <div className="absolute top-[56px] right-[34px] w-3 h-2 bg-[#F48FB1] rounded-full opacity-80 blur-[1px]"></div>
            </div>
          </div>
          
          {/* Async Gemini Feedback Speech Bubble */}
          <div className="relative mt-4 w-full min-w-[300px] max-w-sm bg-white px-5 py-3 rounded-2xl shadow-sm border-[3px] border-[#E6D4FF] z-20">
            {/* Bubble Pointer (Top) */}
            <div className="absolute -top-[10px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-[3px] border-t-[3px] border-[#E6D4FF] rotate-45 rounded-sm"></div>
            <p className="text-base font-medium text-[var(--text-primary)] text-center">{feedbackText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
