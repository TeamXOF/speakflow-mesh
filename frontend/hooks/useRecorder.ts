"use client";

/**
 * Compact mic-capture hook for Story Mode levels: MediaRecorder with
 * reading-assessment fidelity (noise suppression off, 128 kbps), live volume
 * for the waveform, and a stop() that resolves the recorded blob.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPrefs } from "@/lib/prefs";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    rafRef.current = null;
    timerRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    setVolume(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    const savedMic = loadPrefs().preferredMic;
    const mic: MediaTrackConstraints = { noiseSuppression: false };
    let stream: MediaStream;
    if (savedMic) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: savedMic }, ...mic },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: mic });
      }
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: mic });
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      setVolume(buf.reduce((a, v) => a + v, 0) / buf.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(100);

    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setIsRecording(true);
  }, []);

  /** Stops recording and resolves with the audio blob. */
  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }
      recorder.onstop = () => {
        cleanup();
        setIsRecording(false);
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recorder.stop();
    });
  }, [cleanup]);

  return { isRecording, volume, seconds, start, stop };
}
