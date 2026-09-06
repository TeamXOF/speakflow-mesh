"use client";

import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotificationToaster() {
  const { notifications } = useSpeakFlow();
  const [visibleNotifs, setVisibleNotifs] = useState(notifications);

  // Sync and auto-dismiss logic
  useEffect(() => {
    setVisibleNotifs(notifications);
    
    // Auto-hide after 5 seconds
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setVisibleNotifs(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {visibleNotifs.slice(0, 3).map((notif) => (
        <div 
          key={notif.id} 
          className="bg-white rounded-lg shadow-xl border border-gray-100 p-4 pointer-events-auto transform transition-all duration-300 translate-x-0 opacity-100 flex items-start"
        >
          <div className="mr-3 mt-0.5">
            {notif.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {notif.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {notif.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            {notif.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-text-primary">{notif.title}</h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{notif.message}</p>
          </div>
          <button 
            onClick={() => setVisibleNotifs(prev => prev.filter(n => n.id !== notif.id))}
            className="text-text-muted hover:text-text-primary ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
