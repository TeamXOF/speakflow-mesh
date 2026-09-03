'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { category: 'Pronunciation', errors: 43 },
  { category: 'Fluency', errors: 38 },
  { category: 'Pacing', errors: 19 },
];

export default function StrugglingAreasChart() {
  return (
    <div className="speakflow-card p-6 shadow-sm flex flex-col h-full min-h-[350px]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Top Struggling Areas</h3>
      <div className="flex-1 w-full h-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 65 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} domain={[0, 100]} />
            <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-primary)', fontWeight: 500 }} dx={-10} />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => [`${value}%`, 'Errors']}
            />
            <Bar dataKey="errors" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
