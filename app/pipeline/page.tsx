'use client';

import React, { useEffect, useState } from 'react';
import { useSpeakFlow } from '@/Context/SpeakFlowContext';
import { Activity, Play, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

export default function PipelineMonitorPage() {
  const { pipelineState, pipelineLogs, phase1Result, phase2Result } = useSpeakFlow();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />;
      case 'error': return <XCircle className="w-5 h-5 text-[var(--error)]" />;
      case 'running': return <Play className="w-5 h-5 text-[var(--warning)] animate-pulse" />;
      default: return <Clock className="w-5 h-5 text-[var(--text-secondary)] opacity-50" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'border-l-4 border-[var(--success)]';
      case 'error': return 'border-l-4 border-[var(--error)]';
      case 'running': return 'border-l-4 border-[var(--warning)] bg-orange-50';
      default: return 'border-l-4 border-gray-200 opacity-70';
    }
  };

  // Extract latencies safely
  const sttLatency = phase1Result?.latency_ms?.stt;
  const acousticLatency = phase1Result?.latency_ms?.acoustic;
  const fbLatency = phase2Result?.latency_ms?.gemini_feedback;
  const hesLatency = phase2Result?.latency_ms?.gemini_hesitation;

  const stages = [
    { id: 'stt', name: 'Speech to Text', status: pipelineState.stt, latency: sttLatency, source: phase1Result?.stt_source },
    { id: 'acoustic', name: 'Acoustic Analysis', status: pipelineState.acoustic, latency: acousticLatency, source: 'librosa' },
    { id: 'feedback', name: 'Gemini Feedback', status: pipelineState.feedback, latency: fbLatency, source: phase2Result?.feedback_source },
    { id: 'hesitation', name: 'Gemini Hesitation', status: pipelineState.hesitation, latency: hesLatency, source: 'gemini' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-64px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-[32px] font-bold text-[var(--text-primary)]">Pipeline Monitor</h1>
        <p className="text-[var(--text-secondary)] mt-1">Real-time status of backend processing stages</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Stages View */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 pb-8">
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="text-xl font-bold">Stages</h2>
          </div>

          {stages.map((stage) => (
            <div key={stage.id} className={`speakflow-card p-4 transition-all duration-300 ${getStatusColor(stage.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(stage.status)}
                  <h3 className="font-bold text-[var(--text-primary)]">{stage.name}</h3>
                </div>
                <span className={`text-xs uppercase font-bold px-2 py-1 rounded-full ${
                  stage.status === 'done' ? 'bg-green-100 text-green-800' :
                  stage.status === 'running' ? 'bg-orange-100 text-orange-800' :
                  stage.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {stage.status}
                </span>
              </div>
              
              <div className="flex justify-between items-end mt-4 text-sm">
                <div className="text-[var(--text-secondary)]">
                  <span className="font-semibold">Source: </span>
                  <span className="uppercase">{stage.source || '---'}</span>
                </div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {stage.latency ? `${stage.latency}ms` : '---'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Log Panel */}
        <div className="lg:col-span-2 flex flex-col h-full bg-[#1A1B26] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="bg-[#24283B] px-4 py-3 flex items-center space-x-2 border-b border-gray-800 shrink-0">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 font-mono text-sm font-semibold">system.log</span>
            <div className="flex-1"></div>
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
          </div>
          
          <div className="flex-1 p-4 font-mono text-sm overflow-y-auto custom-scrollbar">
            {pipelineLogs.length === 0 ? (
              <div className="text-gray-500 italic flex h-full items-center justify-center">
                Waiting for session to start...
              </div>
            ) : (
              <div className="space-y-2">
                {pipelineLogs.map((log, i) => (
                  <div key={i} className="flex">
                    <span className="text-gray-500 select-none mr-4 w-6 text-right">{i + 1}</span>
                    <span className="text-green-400">
                      {log}
                    </span>
                  </div>
                ))}
                {/* Auto-scroll anchor could go here */}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
