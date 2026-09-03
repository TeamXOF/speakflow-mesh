'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'Mon', accuracy: 65 },
  { day: 'Tue', accuracy: 68 },
  { day: 'Wed', accuracy: 70 },
  { day: 'Thu', accuracy: 69 },
  { day: 'Fri', accuracy: 72 },
  { day: 'Sat', accuracy: 71 },
  { day: 'Sun', accuracy: 74 },
];

export default function PerformanceChart({ title = "Class Performance (Last 7 Days)" }: { title?: string }) {
  return (
    <div className="speakflow-card p-6 shadow-sm flex flex-col h-full min-h-[350px]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">{title}</h3>
      <div className="flex-1 w-full h-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} dx={-10} domain={[40, 100]} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
              type="monotone" 
              dataKey="accuracy" 
              stroke="var(--accent-primary)" 
              strokeWidth={4} 
              dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
