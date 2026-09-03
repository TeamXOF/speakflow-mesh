import StatCard from '@/components/Dashboard/StatCard';
import PerformanceChart from '@/components/Dashboard/PerformanceChart';
import StrugglingAreasChart from '@/components/Dashboard/StrugglingAreasChart';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Students" value="28" />
        <StatCard title="Daily Sessions" value="12" />
        <StatCard title="Class Accuracy" value="72%" />
        <StatCard title="Improvement" value="+9" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PerformanceChart />
        <StrugglingAreasChart />
      </div>
    </div>
  );
}
