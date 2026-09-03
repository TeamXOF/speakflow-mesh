export default function StatCard({ title, value, delta }: { title: string, value: string | number, delta?: string }) {
  return (
    <div className="speakflow-card p-6 shadow-sm flex flex-col justify-center gap-2">
      <h3 className="text-[var(--text-secondary)] font-medium">{title}</h3>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-4xl font-bold text-[var(--text-primary)]">{value}</span>
        {delta && (
          <span className={`text-sm font-bold ${delta.startsWith('+') ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
