'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import StatCard from '@/components/Dashboard/StatCard';
import PerformanceChart from '@/components/Dashboard/PerformanceChart';
import StrugglingWords from '@/components/Dashboard/StrugglingWords';
import { fetchStudentDashboard } from '@/lib/api';

export default function StudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  const [metrics, setMetrics] = useState({
    active_sessions: 0,
    average_accuracy: 0,
    average_wpm: 0,
    improvement: 0,
    struggling_words: []
  });

  useEffect(() => {
    fetchStudentDashboard(resolvedParams.id).then(data => {
      setMetrics(data as any);
    }).catch(console.error);
  }, [resolvedParams.id]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Back Link */}
      <div>
        <Link 
          href="/students" 
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Students
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Student {resolvedParams.id.slice(-4)}</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Level 3 • 8 Years
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <Calendar size={18} className="text-[var(--text-secondary)]" />
          Last 7 Days
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Sessions" value={metrics.active_sessions.toString()} />
        <StatCard title="Accuracy" value={`${Math.round(metrics.average_accuracy)}%`} />
        <StatCard title="Fluency" value={`${Math.round(metrics.average_wpm)} WPM`} />
        <StatCard title="Improvement" value={metrics.improvement >= 0 ? `+${metrics.improvement.toFixed(1)}%` : `${metrics.improvement.toFixed(1)}%`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PerformanceChart title="Progress Over Time" />
        <StrugglingWords words={metrics.struggling_words} />
      </div>
    </div>
  );
}
