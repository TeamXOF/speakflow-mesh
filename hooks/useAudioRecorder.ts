'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecordingState>('idle');
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    setAudioData(new Uint8Array(dataArray));
    requestRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for chunky waveform blocks
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      
      setStatus('recording');
      requestRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to use SpeakFlow.');
    }
  };

  const stopRecording = () => {
    setStatus('processing');
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    // Simulate processing time
    setTimeout(() => {
      setStatus('complete');
    }, 3000);
  };

  const resetAudio = useCallback(() => {
    setStatus('idle');
    setAudioData(new Uint8Array(0));
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    };
  }, []);

  return { status, audioData, startRecording, stopRecording, resetAudio };
}
