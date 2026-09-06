"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { loadPrefs } from "@/lib/prefs";
import { runPipeline } from "@/lib/api";
import { savePrefs } from "@/lib/prefs";

// Types for the global state
export type SessionState = "idle" | "listening" | "processing" | "complete";

export interface AgentStatus {
  id: string;
  name: string;
  status: "pending" | "processing" | "complete" | "error";
  result?: any;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  level: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export type SpokenWord = {
  word: string; start: number; end: number;
  duration_ms?: number; probability?: number;
};

export type ScoredWord = {
  word: string;
  spoken?: string;
  correct: boolean;
  phoneme_mismatch: string | null;
  extra?: boolean;
};

interface SpeakFlowState {
  // Session State
  sessionState: SessionState;
  startSession: () => void;
  stopListening: () => void;
  resetSession: () => void;

  // Active Data
  activeStudent: Student | null;
  setActiveStudent: (student: Student) => void;
  
  // Target Sentence Selection
  targetSentence: string;
  setTargetSentence: (sentence: string) => void;
  availableSentences: string[];
  addAvailableSentence: (sentence: string) => void;

  // Reading language for this dashboard ("en" | "ur") — persisted to prefs
  language: "en" | "ur";
  setLanguage: (lang: "en" | "ur") => void;
  replaceSentences: (sentences: string[]) => void;
  
  // Real-time Text & Audio
  transcript: string;
  setTranscript: (text: string) => void;
  recordingTime: number;
  audioVolume: number;

  // Session Results
  overallScore: number | null;
  wpm: number | null;
  accuracy: number | null;
  pauses: number | null;
  spokenWords: SpokenWord[];
  scoredWords: ScoredWord[];

  // Agents
  agents: AgentStatus[];
  setAgentStatus: (id: string, status: AgentStatus["status"], result?: any) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsAsRead: () => void;
}

const defaultAgents: AgentStatus[] = [
  { id: "phonetic", name: "Phonetic Analyst", status: "pending" },
  { id: "difficulty", name: "Difficulty Assessor", status: "pending" },
  { id: "engagement", name: "Engagement Tracker", status: "pending" },
  { id: "practice", name: "Practice Generator", status: "pending" },
  { id: "progress", name: "Progress Synthesizer", status: "pending" },
];

const SpeakFlowContext = createContext<SpeakFlowState | undefined>(undefined);

export function SpeakFlowProvider({ children }: { children: ReactNode }) {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [activeStudent, setActiveStudent] = useState<Student | null>({
    id: "student-1",
    name: "Aarav Sharma",
    grade: "Grade 3",
    level: "Level 2"
  });

  const [availableSentences, setAvailableSentences] = useState<string[]>([
    "The brave driver drove through the cold dark street.",
    "A quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore on a sunny day.",
    "The little cat slept quietly near the warm fire.",
    "We walked together under the bright blue sky."
  ]);

  const addAvailableSentence = (sentence: string) => {
    if (!availableSentences.includes(sentence)) {
      setAvailableSentences(prev => [...prev, sentence]);
    }
  };

  /** Swap the whole warm-up pool (dynamic sentence generator) and target the first. */
  const replaceSentences = (sentences: string[]) => {
    const clean = sentences.filter(Boolean);
    if (!clean.length) return;
    setAvailableSentences(clean);
    setTargetSentence(clean[0]);
  };

  const [targetSentence, setTargetSentence] = useState<string>(availableSentences[0]);

  // Reading language — initialized from the student's saved preference
  const [language, setLanguageState] = useState<"en" | "ur">(() => loadPrefs().storyLanguage);
  const setLanguage = (lang: "en" | "ur") => {
    setLanguageState(lang);
    savePrefs({ storyLanguage: lang });
  };
  
  const [spokenWords, setSpokenWords] = useState<SpokenWord[]>([]);
  const [scoredWords, setScoredWords] = useState<ScoredWord[]>([]);
  const [transcript, setTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [pauses, setPauses] = useState<number | null>(null);
  
  const [agents, setAgents] = useState<AgentStatus[]>(defaultAgents);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Refs for audio processing
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const startSession = async () => {
    try {
      // Honor the student's preferred mic (Settings → Reading Preferences);
      // fall back to the system default if that device has vanished.
      const savedMic = loadPrefs().preferredMic;
      // noiseSuppression OFF: Chrome's suppressor smears quiet word endings
      // (the -ed/-t sounds) that reading assessment depends on
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
      
      setSessionState("listening");
      setTranscript(""); // Clear transcript for new session
      setAgents(defaultAgents); // Reset agents
      setRecordingTime(0);
      audioChunksRef.current = [];

      // Setup Audio Analyser for volume visualization
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

      // Setup MediaRecorder — high bitrate so word endings survive compression
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // collect 100ms chunks of data

      // Start Timer — the displayed 30s cap is now actually enforced
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      addNotification({
        title: "Microphone Access Denied",
        message: "Please allow microphone access to start a reading session.",
        type: "error"
      });
    }
  };

  const stopListening = async () => {
    if (!activeStudent || sessionState !== "listening") return;
    
    // Stop recording and wait for final chunks
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    
    setAudioVolume(0);
    setSessionState("processing");
    setAgents(agents.map(a => ({ ...a, status: "processing" })));
    
    // Convert audio blob to base64
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });

      // Call the REAL Python FastAPI backend with base64 audio
      const response = await runPipeline(
        activeStudent.id,
        base64Audio,
        targetSentence,
        language
      );

      // Set transcript from Whisper output
      if (response.transcript) {
        setTranscript(response.transcript);
      }

      // Set score, WPM, and telemetry from real backend computation
      if (response.overall_score != null) setOverallScore(response.overall_score);
      if (response.wpm != null) setWpm(response.wpm);
      if (response.accuracy != null) setAccuracy(response.accuracy);
      if (response.pauses != null) setPauses(response.pauses);
      setSpokenWords(response.words_spoken || []);
      setScoredWords(response.words || []);

      // Update each agent with its real result
      const diagnosis = response.diagnosis || {};
      setAgents(prev => prev.map(agent => {
        const result = diagnosis[agent.id];
        return {
          ...agent,
          status: result && !result.error ? "complete" : "error",
          result: result ?? null,
        };
      }));

      setSessionState("complete");
      addNotification({
        title: "Session Complete",
        message: `Diagnosis ready for ${activeStudent.name}. Score: ${response.overall_score ?? "--"}/100`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Pipeline execution failed:", error);
      setAgents(prev => prev.map(a => ({ ...a, status: "error" })));
      setSessionState("idle");
      addNotification({
        title: "Session Failed",
        message: error?.message || "Failed to connect to backend AI agents.",
        type: "error",
      });
    }
  };

  // Enforce the 30-second cap shown in the UI (auto-stop)
  React.useEffect(() => {
    if (sessionState === "listening" && recordingTime >= 30) {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingTime, sessionState]);

  const resetSession = () => {
    setSessionState("idle");
    setAgents(defaultAgents);
    setRecordingTime(0);
    setTranscript("");
    setOverallScore(null);
    setWpm(null);
    setAccuracy(null);
    setPauses(null);
    setSpokenWords([]);
    setScoredWords([]);
  };

  const setAgentStatus = (id: string, status: AgentStatus["status"], result?: any) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status, result } : a));
  };

  return (
    <SpeakFlowContext.Provider value={{
      sessionState, startSession, stopListening, resetSession,
      activeStudent, setActiveStudent,
      targetSentence, setTargetSentence, availableSentences, addAvailableSentence, replaceSentences,
      language, setLanguage,
      transcript, setTranscript,
      recordingTime, audioVolume,
      overallScore, wpm, accuracy, pauses, spokenWords, scoredWords,
      agents, setAgentStatus,
      notifications, addNotification, markNotificationsAsRead
    }}>
      {children}
    </SpeakFlowContext.Provider>
  );
}

export function useSpeakFlow() {
  const context = useContext(SpeakFlowContext);
  if (context === undefined) {
    throw new Error("useSpeakFlow must be used within a SpeakFlowProvider");
  }
  return context;
}
