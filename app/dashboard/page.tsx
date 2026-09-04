'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/Dashboard/StatCard';
import PerformanceChart from '@/components/Dashboard/PerformanceChart';
import StrugglingAreasChart from '@/components/Dashboard/StrugglingAreasChart';
import { fetchClassDashboard } from '@/lib/api';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    active_students: 0,
    daily_sessions: 0,
    class_accuracy: 0,
    improvement: 0
  });

  useEffect(() => {
    fetchClassDashboard().then(data => {
      setMetrics(data);
    }).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Students" value={metrics.active_students.toString()} />
        <StatCard title="Daily Sessions" value={metrics.daily_sessions.toString()} />
        <StatCard title="Class Accuracy" value={`${Math.round(metrics.class_accuracy)}%`} />
        <StatCard title="Improvement" value={metrics.improvement >= 0 ? `+${metrics.improvement}` : metrics.improvement.toString()} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PerformanceChart />
        <StrugglingAreasChart />
      </div>
    </div>
  );
}
