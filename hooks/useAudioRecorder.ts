'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecordingState>('idle');
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const updateWaveform = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    setAudioData(new Uint8Array(dataArray));
    requestRef.current = requestAnimationFrame(updateWaveform);
  };

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
      
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setStatus('complete');
      };

      mediaRecorder.start();
      setStatus('recording');
      requestRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to use SpeakFlow.');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    setStatus('processing');
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const resetAudio = useCallback(() => {
    setStatus('idle');
    setAudioData(new Uint8Array(0));
    setAudioBlob(null);
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  return { status, audioData, audioBlob, startRecording, stopRecording, resetAudio };
}
