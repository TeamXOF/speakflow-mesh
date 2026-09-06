'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  resolveApiBase, 
  createSession, 
  analyzeCheckpoint, 
  fetchFeedback, 
  Phase1Response, 
  Phase2Response 
} from '@/lib/api';

export type PipelineStatus = 'idle' | 'running' | 'done' | 'error';

export type PipelineState = {
  stt: PipelineStatus;
  acoustic: PipelineStatus;
  feedback: PipelineStatus;
  hesitation: PipelineStatus;
};

export type ToastMessage = {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
};

type SpeakFlowContextType = {
  sessionId: string | null;
  phase1Result: Phase1Response | null;
  phase2Result: Phase2Response | null;
  pipelineState: PipelineState;
  toasts: ToastMessage[];
  pipelineLogs: string[];
  startNewSession: (studentId: string, storyId: string, language: string) => Promise<void>;
  recordAndAnalyzeCheckpoint: (checkpointId: string, audioBlob: Blob) => Promise<void>;
  addNotification: (type: ToastMessage['type'], message: string) => void;
  removeNotification: (id: string) => void;
  addPipelineLog: (msg: string) => void;
};

const SpeakFlowContext = createContext<SpeakFlowContextType | null>(null);

export function SpeakFlowProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase1Result, setPhase1Result] = useState<Phase1Response | null>(null);
  const [phase2Result, setPhase2Result] = useState<Phase2Response | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    stt: 'idle',
    acoustic: 'idle',
    feedback: 'idle',
    hesitation: 'idle',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const removeNotification = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addNotification = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeNotification(id), 5000);
  }, [removeNotification]);

  const addPipelineLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setPipelineLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const setupWebSocket = useCallback(async (id: string) => {
    const { baseUrl } = await resolveApiBase();
    // Convert http/https to ws/wss
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws/sessions/${id}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.phase === 2) {
            setPhase2Result(data as Phase2Response);
            setPipelineState(prev => ({ ...prev, feedback: 'done', hesitation: 'done' }));
            addPipelineLog(`Gemini Feedback received async via WS - ${data.latency_ms?.gemini_feedback || 0}ms`);
            
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (err) {
          console.error("WS Parse Error:", err);
        }
      };

      ws.onerror = () => {
        console.warn("WebSocket error, relying on polling fallback.");
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn("WebSocket setup failed, relying on polling fallback.", err);
    }
  }, []);

  const startNewSession = useCallback(async (studentId: string, storyId: string, language: string) => {
    try {
      addPipelineLog(`Starting session for student ${studentId}...`);
      const session = await createSession(studentId, storyId, language);
      setSessionId(session.id || session.session_id); // Handle both formats just in case
      addPipelineLog(`Session created: ${session.id || session.session_id}`);
      await setupWebSocket(session.id || session.session_id);
    } catch (err: any) {
      addNotification('error', `Failed to start session: ${err.message}`);
    }
  }, [addNotification, setupWebSocket]);

  const startPolling = (sid: string, checkpointId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds at 2s intervals

    pollingRef.current = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        setPipelineState(prev => ({ ...prev, feedback: 'error', hesitation: 'error' }));
        addNotification('error', 'Feedback timeout. Please try again.');
        return;
      }
      
      try {
        attempts++;
        const feedback = await fetchFeedback(sid, checkpointId);
        if (feedback && feedback.feedback_text) {
          setPhase2Result(feedback);
          setPipelineState(prev => ({ ...prev, feedback: 'done', hesitation: 'done' }));
          addPipelineLog(`Gemini Feedback received via polling - ${feedback.latency_ms?.gemini_feedback || 0}ms`);
          clearInterval(pollingRef.current!);
        }
      } catch (err) {
        // Just ignore errors during polling and try again
      }
    }, 2000);
  };

  const recordAndAnalyzeCheckpoint = useCallback(async (checkpointId: string, audioBlob: Blob) => {
    if (!sessionId) {
      setPipelineState(prev => ({ ...prev, stt: 'error', acoustic: 'error' }));
      addNotification('error', 'No active session. Please restart.');
      return;
    }

    if (audioBlob.size < 1000) {
      addNotification('warning', 'Audio recording was too short. Please try speaking a bit longer.');
      setPipelineState(prev => ({ ...prev, stt: 'error', acoustic: 'error' }));
      return;
    }

    setPhase1Result(null);
    setPhase2Result(null);
    setPipelineState({
      stt: 'running',
      acoustic: 'running',
      feedback: 'running', // Phase 2 starts processing immediately after Phase 1 on the backend
      hesitation: 'running',
    });
    addPipelineLog(`Submitted audio for checkpoint ${checkpointId}. Awaiting Phase 1...`);

    try {
      const p1Data = await analyzeCheckpoint(sessionId, checkpointId, audioBlob);
      setPhase1Result(p1Data);
      setPipelineState(prev => ({ ...prev, stt: 'done', acoustic: 'done' }));
      addPipelineLog(`Phase 1 STT & Acoustic complete - Total: ${p1Data.latency_ms?.total_phase1 || 0}ms (STT: ${p1Data.latency_ms?.stt || 0}ms)`);

      // Surface warnings if any
      if (p1Data.warnings && p1Data.warnings.length > 0) {
        p1Data.warnings.forEach(warn => addNotification('warning', warn));
      }

      // Always poll for Phase 2 because the REST endpoint processes Phase 2 in the background
      // and currently does not push results to the WebSocket connection.
      addPipelineLog(`Starting polling for Phase 2 results...`);
      startPolling(sessionId, checkpointId);
    } catch (err: any) {
      setPipelineState(prev => ({ ...prev, stt: 'error', acoustic: 'error' }));
      addPipelineLog(`Error during Phase 1: ${err.message}`);
      addNotification('error', `Analysis failed: ${err.message}`);
    }
  }, [sessionId, addNotification, addPipelineLog]);

  return (
    <SpeakFlowContext.Provider value={{
      sessionId,
      phase1Result,
      phase2Result,
      pipelineState,
      toasts,
      pipelineLogs,
      startNewSession,
      recordAndAnalyzeCheckpoint,
      addNotification,
      removeNotification,
      addPipelineLog
    }}>
      {children}
      
      {/* Lightweight Toast Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                toast.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                'bg-white border-gray-200 text-gray-800'}
            `}
          >
            <p className="font-medium text-sm pr-4">{toast.message}</p>
            <button onClick={() => removeNotification(toast.id)} className="text-current opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        ))}
      </div>
    </SpeakFlowContext.Provider>
  );
}

export function useSpeakFlow() {
  const context = useContext(SpeakFlowContext);
  if (!context) {
    throw new Error('useSpeakFlow must be used within SpeakFlowProvider');
  }
  return context;
}
