import { Star } from 'lucide-react';

interface MascotMessageProps {
  message: string;
  feedbackText?: string;
}

export default function MascotMessage({ message, feedbackText }: MascotMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 relative w-full max-w-md mx-auto">
      <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-wide">{message}</h2>
      
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
          <div className="relative w-36 h-36">
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
              {/* The Star Body */}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
              <div className="flex gap-5">
                {/* Eyes */}
                <div className="relative w-3 h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <div className="relative w-3 h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              {/* Smile */}
              <div className="w-5 h-2.5 border-b-[3px] border-gray-800 rounded-b-full mt-1.5"></div>
              {/* Blush cheeks */}
              <div className="absolute top-[72px] left-[42px] w-4 h-2.5 bg-[#F48FB1] rounded-full opacity-80 blur-[2px]"></div>
              <div className="absolute top-[72px] right-[42px] w-4 h-2.5 bg-[#F48FB1] rounded-full opacity-80 blur-[2px]"></div>
            </div>
          </div>
          
          {/* Async Gemini Feedback Speech Bubble */}
          {feedbackText && (
            <div className="absolute top-[130px] w-[350px] bg-white px-6 py-4 rounded-3xl shadow-sm border-[3px] border-[#E6D4FF] z-20 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
              {/* Bubble Pointer (Top) */}
              <div className="absolute -top-[10px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-[3px] border-t-[3px] border-[#E6D4FF] rotate-45 rounded-sm"></div>
              <p className="text-lg font-medium text-[var(--text-primary)] text-center">{feedbackText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
