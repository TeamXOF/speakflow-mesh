'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import StatCard from '@/components/Dashboard/StatCard';
import PerformanceChart from '@/components/Dashboard/PerformanceChart';
import StrugglingWords from '@/components/Dashboard/StrugglingWords';

const DEMO_STUDENTS = [
  { id: "stu_001", name: "Ayaan Khan", level: 2, age: 7 },
  { id: "stu_002", name: "Fatima Ali", level: 3, age: 8 },
  { id: "stu_003", name: "Zain Ahmed", level: 1, age: 6 },
];

export default function StudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  const student = DEMO_STUDENTS.find(s => s.id === resolvedParams.id) || DEMO_STUDENTS[0];

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
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{student.name}</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Level {student.level} • {student.age} Years
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <Calendar size={18} className="text-[var(--text-secondary)]" />
          Last 7 Days
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Checkpoints" value="8/15" />
        <StatCard title="Accuracy" value="78%" />
        <StatCard title="Fluency" value="82 WPM" />
        <StatCard title="Improvement" value="+12%" delta="↑" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PerformanceChart title="Progress Over Time" />
        <StrugglingWords />
      </div>
    </div>
  );
}
