'use client';

import React, { useEffect, useState } from 'react';
import { resolveApiBase, triggerSync } from '@/lib/api';
import { useSpeakFlow } from '@/Context/SpeakFlowContext';
import { Server, Activity, Database, Lock, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const StatusIcon = ({ isReachable }: { isReachable: boolean }) => (
  isReachable 
    ? <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
    : <XCircle className="w-5 h-5 text-[var(--error)]" />
);

export default function SettingsPage() {
  const { addNotification } = useSpeakFlow();
  const [health, setHealth] = useState<{ mode: string, groq_reachable: boolean, gemini_reachable: boolean }>({
    mode: 'checking...',
    groq_reachable: false,
    gemini_reachable: false
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      const status = await resolveApiBase();
      setHealth(status);
    }
    checkHealth();
    // Poll every 10s
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      addNotification('success', 'Sync completed successfully');
    } catch (err: any) {
      addNotification('error', `Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-[32px] font-bold text-[var(--text-primary)]">Settings & Status</h1>
        <p className="text-[var(--text-secondary)] mt-1">Manage pipeline connections and system health</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backend Status Card */}
        <section className="speakflow-card p-6 flex flex-col space-y-6">
          <div className="flex items-center space-x-3 border-b border-[var(--border-color)] pb-4">
            <div className="bg-[var(--accent-primary)]/20 p-3 rounded-xl">
              <Server className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Backend Status</h2>
              <p className="text-sm text-[var(--text-secondary)]">Current API connectivity</p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-base)]">
              <span className="text-[var(--text-secondary)]">Main API Mode</span>
              <span className={`font-bold uppercase ${health.mode === 'online' ? 'text-[var(--success)]' : health.mode === 'offline' ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]'}`}>
                {health.mode}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-base)]">
              <span className="text-[var(--text-secondary)]">Groq (Whisper API)</span>
              <div className="flex items-center space-x-2">
                <StatusIcon isReachable={health.groq_reachable} />
                <span className="uppercase text-xs font-bold text-[var(--text-secondary)]">{health.groq_reachable ? 'REACHABLE' : 'UNREACHABLE'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-base)]">
              <span className="text-[var(--text-secondary)]">Gemini 3.5 Flash</span>
              <div className="flex items-center space-x-2">
                <StatusIcon isReachable={health.gemini_reachable} />
                <span className="uppercase text-xs font-bold text-[var(--text-secondary)]">{health.gemini_reachable ? 'REACHABLE' : 'UNREACHABLE'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sync Status Card */}
        <section className="speakflow-card p-6 flex flex-col space-y-6">
          <div className="flex items-center space-x-3 border-b border-[var(--border-color)] pb-4">
            <div className="bg-[var(--accent-secondary)]/20 p-3 rounded-xl">
              <Database className="w-6 h-6 text-[var(--accent-secondary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Sync Status</h2>
              <p className="text-sm text-[var(--text-secondary)]">Local SQLite data synchronization</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-4">
            <div>
              <div className="text-4xl font-mono font-bold text-[var(--text-primary)]">0</div>
              <div className="text-[var(--text-secondary)] text-sm mt-1">Unsynced Sessions</div>
            </div>
            
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[#b8aee0] text-[var(--text-primary)] px-6 py-3 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </section>

        {/* Pipeline Architecture Card */}
        <section className="speakflow-card p-6 md:col-span-2">
          <div className="flex items-center space-x-3 border-b border-[var(--border-color)] pb-4 mb-6">
            <div className="bg-[var(--accent-primary)]/20 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Pipeline Architecture</h2>
              <p className="text-sm text-[var(--text-secondary)]">How SpeakFlow processes audio</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] border-dashed">
            <div className="text-center md:text-left flex-1">
              <h3 className="font-bold text-[var(--text-primary)]">1. Speech to Text (STT)</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-2">Groq Whisper API (Online) or<br/>local quantized Whisper (Offline)</p>
            </div>
            
            <div className="text-[var(--accent-primary)] hidden md:block">➔</div>
            
            <div className="text-center md:text-left flex-1 border-t md:border-t-0 md:border-l border-[var(--border-color)] md:pl-6 pt-4 md:pt-0">
              <h3 className="font-bold text-[var(--text-primary)]">2. Acoustic Analysis</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-2">librosa extracts pitch, formants,<br/>and zero-crossing rate locally</p>
            </div>

            <div className="text-[var(--accent-primary)] hidden md:block">➔</div>

            <div className="text-center md:text-left flex-1 border-t md:border-t-0 md:border-l border-[var(--border-color)] md:pl-6 pt-4 md:pt-0">
              <h3 className="font-bold text-[var(--text-primary)]">3. AI Feedback</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-2">Gemini 3.5 Flash-Lite generates<br/>kid-friendly encouraging tips</p>
            </div>
          </div>

          <div className="mt-6 flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <span className="font-bold">Privacy Note:</span> The hesitation judgment feature sends a short audio clip to Google's API for analysis. All other audio processing is local.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
