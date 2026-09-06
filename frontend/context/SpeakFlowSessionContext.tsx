"use client";

/**
 * SpeakFlow v2 session state — checkpoint-based, two-phase sessions.
 * Adapted from the team's drafted Context/SpeakFlowContext.tsx (roadmap
 * UI Prompt 2), extended with the proven mic-capture logic from the Gen-1
 * context and checkpoint progression for the Child Mode story flow.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  resolveApiBase,
  createSession,
  analyzeCheckpoint,
  fetchFeedback,
  fetchSessionDetail,
  Phase1Response,
  Phase2Response,
  Language,
  SessionDetail,
} from "@/lib/api";
import { loadPrefs } from "@/lib/prefs";

export type PipelineStatus = "idle" | "running" | "done" | "error";

export type PipelineState = {
  stt: PipelineStatus;
  acoustic: PipelineStatus;
  feedback: PipelineStatus;
  hesitation: PipelineStatus;
};

export type ToastMessage = {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
};

export type SessionReader = { id: string; name: string; grade: number | string };

type SpeakFlowSessionContextType = {
  sessionId: string | null;
  session: SessionDetail | null;
  checkpoints: { checkpoint_id: string; target_text: string }[];
  currentCheckpointIndex: number;
  currentCheckpoint: { checkpoint_id: string; target_text: string } | null;
  language: Language;
  setLanguage: (l: Language) => void;
  reader: SessionReader | null;
  setReader: (r: SessionReader) => void;
  phase1Result: Phase1Response | null;
  phase2Result: Phase2Response | null;
  pipelineState: PipelineState;
  isRecording: boolean;
  audioVolume: number;
  sessionComplete: boolean;
  toasts: ToastMessage[];
  pipelineLogs: string[];
  startNewSession: (studentId: string, storyId: string, language: Language) => Promise<string | null>;
  adoptSession: (sessionId: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecordingAndAnalyze: () => Promise<void>;
  retryCheckpoint: () => void;
  advanceCheckpoint: () => void;
  refreshSession: () => Promise<void>;
  resetSession: () => void;
  addNotification: (type: ToastMessage["type"], message: string) => void;
  removeNotification: (id: string) => void;
  addPipelineLog: (msg: string) => void;
};

const SpeakFlowSessionContext = createContext<SpeakFlowSessionContextType | null>(null);

export function SpeakFlowSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [checkpoints, setCheckpoints] = useState<{ checkpoint_id: string; target_text: string }[]>([]);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("en");
  const [reader, setReader] = useState<SessionReader | null>(null);
  const [phase1Result, setPhase1Result] = useState<Phase1Response | null>(null);
  const [phase2Result, setPhase2Result] = useState<Phase2Response | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    stt: "idle",
    acoustic: "idle",
    feedback: "idle",
    hesitation: "idle",
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Mic capture refs (logic proven in the Gen-1 context — reused, not rewritten)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const removeNotification = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: ToastMessage["type"], message: string) => {
      const id = Math.random().toString(36).slice(2, 11);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeNotification(id), 5000);
    },
    [removeNotification]
  );

  const addPipelineLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setPipelineLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const setupWebSocket = useCallback(async (id: string) => {
    const { baseUrl } = await resolveApiBase();
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/sessions/${id}`;
    try {
      // Close any socket from a previous session before opening a new one
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* already closed */ }
        wsRef.current = null;
      }
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.phase === 2) {
            setPhase2Result(data as Phase2Response);
            setPipelineState((prev) => ({ ...prev, feedback: "done", hesitation: "done" }));
            addPipelineLog(
              `Phase 2 feedback received via WS - ${data.latency_ms?.gemini_feedback || 0}ms (${data.feedback_source})`
            );
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
  }, [addPipelineLog]);

  const startPolling = (sid: string, checkpointId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds at 2s intervals

    pollingRef.current = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        setPipelineState((prev) => ({ ...prev, feedback: "error", hesitation: "error" }));
        addNotification("error", "Feedback timeout. Please try again.");
        return;
      }
      try {
        attempts++;
        const feedback = await fetchFeedback(sid, checkpointId);
        if (feedback && feedback.feedback_text) {
          setPhase2Result(feedback);
          setPipelineState((prev) => ({ ...prev, feedback: "done", hesitation: "done" }));
          addPipelineLog(
            `Phase 2 feedback received via polling - ${feedback.latency_ms?.gemini_feedback || 0}ms (${feedback.feedback_source})`
          );
          clearInterval(pollingRef.current!);
        }
      } catch (err) {
        // Ignore polling errors and retry
      }
    }, 2000);
  };

  const startNewSession = useCallback(
    async (studentId: string, storyId: string, lang: Language): Promise<string | null> => {
      try {
        addPipelineLog(`Starting story session for student ${studentId}...`);
        const created = await createSession(studentId, storyId, lang);
        const sid = created.session_id || created.id || "";
        setSessionId(sid);
        setCheckpoints(created.checkpoints);
        setCurrentCheckpointIndex(0);
        setLanguage(lang);
        setPhase1Result(null);
        setPhase2Result(null);
        setSession(null);
        setPipelineState({ stt: "idle", acoustic: "idle", feedback: "idle", hesitation: "idle" });
        addPipelineLog(`Session created: ${sid} (${created.checkpoints.length} checkpoints, ${lang})`);
        await setupWebSocket(sid);
        return sid;
      } catch (err: any) {
        addNotification("error", `Failed to start session: ${err.message}`);
        return null;
      }
    },
    [addNotification, addPipelineLog, setupWebSocket]
  );

  /** Reattach to an existing session (e.g. after a page refresh on /read/[id]). */
  const adoptSession = useCallback(
    async (sid: string) => {
      try {
        const detail = await fetchSessionDetail(sid);
        setSessionId(sid);
        setSession(detail);
        setCheckpoints(
          detail.checkpoints.map((c) => ({
            checkpoint_id: c.checkpoint_id,
            target_text: c.target_text,
          }))
        );
        const firstPending = detail.checkpoints.findIndex((c) => c.status === "pending");
        setCurrentCheckpointIndex(firstPending === -1 ? detail.checkpoints.length : firstPending);
        setLanguage((detail.language as Language) || "en");
        if (detail.student_id) {
          setReader({ id: detail.student_id, name: detail.student_name || "Reader", grade: "" });
        }
        setPipelineState({ stt: "idle", acoustic: "idle", feedback: "idle", hesitation: "idle" });
        addPipelineLog(`Reattached to session ${sid}`);
        await setupWebSocket(sid);
      } catch (err: any) {
        addNotification("error", `Could not load that story session: ${err.message}`);
      }
    },
    [addNotification, addPipelineLog, setupWebSocket]
  );

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const detail = await fetchSessionDetail(sessionId);
      setSession(detail);
    } catch {
      /* non-fatal */
    }
  }, [sessionId]);

  // ── Mic capture (adapted from the Gen-1 context's proven implementation) ──
  const startRecording = useCallback(async () => {
    try {
      // Honor the student's preferred mic (Settings → Reading Preferences);
      // fall back to the system default if that device has vanished.
      const savedMic = loadPrefs().preferredMic;
      // noiseSuppression OFF — preserves the quiet word endings (-ed/-t) that
      // reading assessment depends on
      const micConstraints: MediaTrackConstraints = { noiseSuppression: false };
      let stream: MediaStream;
      if (savedMic) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: savedMic }, ...micConstraints },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints });
      }
      setIsRecording(true);
      audioChunksRef.current = [];

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
          setAudioVolume(average);
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start(100);
      addPipelineLog("Recording started...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addNotification("error", "Microphone access is needed to read aloud. Please allow it and try again.");
    }
  }, [addNotification, addPipelineLog]);

  const recordAndAnalyzeCheckpoint = useCallback(
    async (checkpointId: string, audioBlob: Blob) => {
      if (!sessionId) {
        setPipelineState((prev) => ({ ...prev, stt: "error", acoustic: "error" }));
        addNotification("error", "No active session. Please restart.");
        return;
      }

      if (audioBlob.size < 1000) {
        addNotification("warning", "That was a bit too short — try reading the whole sentence!");
        setPipelineState((prev) => ({ ...prev, stt: "error", acoustic: "error" }));
        return;
      }

      setPhase1Result(null);
      setPhase2Result(null);
      setPipelineState({
        stt: "running",
        acoustic: "running",
        feedback: "running",
        hesitation: "running",
      });
      addPipelineLog(`Submitted audio for checkpoint ${checkpointId}. Awaiting Phase 1...`);

      try {
        const p1Data = await analyzeCheckpoint(sessionId, checkpointId, audioBlob);
        setPhase1Result(p1Data);
        setPipelineState((prev) => ({ ...prev, stt: "done", acoustic: "done" }));
        addPipelineLog(
          `Phase 1 complete - Total: ${p1Data.latency_ms?.total_phase1 || 0}ms (STT: ${p1Data.latency_ms?.stt || 0}ms via ${p1Data.stt_source})`
        );

        if (p1Data.warnings && p1Data.warnings.length > 0) {
          p1Data.warnings.forEach((warn) => addNotification("warning", warn));
        }

        // Poll for Phase 2 (WS push also handled by setupWebSocket; first wins)
        addPipelineLog("Awaiting Phase 2 feedback...");
        startPolling(sessionId, checkpointId);
      } catch (err: any) {
        setPipelineState((prev) => ({ ...prev, stt: "error", acoustic: "error" }));
        addPipelineLog(`Error during Phase 1: ${err.message}`);
        addNotification("error", `Analysis failed: ${err.message}`);
      }
    },
    [sessionId, addNotification, addPipelineLog]
  );

  const stopRecordingAndAnalyze = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      setIsRecording(false);
      return;
    }
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    setAudioVolume(0);
    setIsRecording(false);

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const cp = checkpoints[currentCheckpointIndex];
    if (cp) {
      await recordAndAnalyzeCheckpoint(cp.checkpoint_id, audioBlob);
    }
  }, [checkpoints, currentCheckpointIndex, recordAndAnalyzeCheckpoint]);

  const retryCheckpoint = useCallback(() => {
    setPhase1Result(null);
    setPhase2Result(null);
    setPipelineState({ stt: "idle", acoustic: "idle", feedback: "idle", hesitation: "idle" });
  }, []);

  const advanceCheckpoint = useCallback(() => {
    setPhase1Result(null);
    setPhase2Result(null);
    setPipelineState({ stt: "idle", acoustic: "idle", feedback: "idle", hesitation: "idle" });
    setCurrentCheckpointIndex((i) => i + 1);
  }, []);

  const resetSession = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    wsRef.current = null;
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    setSessionId(null);
    setSession(null);
    setCheckpoints([]);
    setCurrentCheckpointIndex(0);
    setPhase1Result(null);
    setPhase2Result(null);
    setReader(null);
    setPipelineState({ stt: "idle", acoustic: "idle", feedback: "idle", hesitation: "idle" });
  }, []);

  const sessionComplete =
    checkpoints.length > 0 && currentCheckpointIndex >= checkpoints.length;

  // Pull full session totals once complete (for the rewards screen)
  useEffect(() => {
    if (sessionComplete && sessionId && !session) {
      refreshSession();
    }
  }, [sessionComplete, sessionId, session, refreshSession]);

  return (
    <SpeakFlowSessionContext.Provider
      value={{
        sessionId,
        session,
        checkpoints,
        currentCheckpointIndex,
        currentCheckpoint: checkpoints[currentCheckpointIndex] || null,
        language,
        setLanguage,
        reader,
        setReader,
        phase1Result,
        phase2Result,
        pipelineState,
        isRecording,
        audioVolume,
        sessionComplete,
        toasts,
        pipelineLogs,
        startNewSession,
        adoptSession,
        startRecording,
        stopRecordingAndAnalyze,
        retryCheckpoint,
        advanceCheckpoint,
        refreshSession,
        resetSession,
        addNotification,
        removeNotification,
        addPipelineLog,
      }}
    >
      {children}

      {/* Lightweight toast overlay (bottom-left; the Gen-1 toaster owns bottom-right) */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-left fade-in duration-300
              ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800"
                : toast.type === "warning" ? "bg-orange-50 border-orange-200 text-orange-800"
                : toast.type === "success" ? "bg-green-50 border-green-200 text-green-800"
                : "bg-white border-gray-200 text-gray-800"}
            `}
          >
            <p className="font-medium text-sm pr-4">{toast.message}</p>
            <button
              onClick={() => removeNotification(toast.id)}
              className="text-current opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </SpeakFlowSessionContext.Provider>
  );
}

export function useSpeakFlowSession() {
  const context = useContext(SpeakFlowSessionContext);
  if (!context) {
    throw new Error("useSpeakFlowSession must be used within SpeakFlowSessionProvider");
  }
  return context;
}
