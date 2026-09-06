"use client";

/**
 * Weekly Progress chart on the engine dashboard — REAL data from the active
 * student's actual session history (accuracy + WPM per session). Empty state
 * when no sessions exist yet; nothing is mocked.
 */

import { useEffect, useState } from "react";
import { LineChart as ChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchSessions } from "@/lib/api";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

type Point = { name: string; wpm: number | null; accuracy: number | null };

export default function ProgressChart() {
  const { activeStudent, sessionState } = useSpeakFlow();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeStudent) return;
      setLoading(true);
      try {
        const sessions = await fetchSessions(activeStudent.id);
        if (cancelled) return;
        const recent = [...sessions]
          .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
          .slice(-7);
        setPoints(recent.map((s) => ({
          name: new Date(s.timestamp.replace(" ", "T")).toLocaleDateString("en-US", { weekday: "short" }),
          wpm: s.wpm != null ? Math.round(s.wpm) : null,
          accuracy: s.accuracy != null ? Math.round(s.accuracy * 100) : null,
        })));
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeStudent, sessionState]); // refetch after each live session completes

  return (
    <div className="speakflow-card p-6 h-full bg-white flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold font-sans text-text-primary flex items-center">
            <ChartIcon className="w-5 h-5 mr-2 text-text-muted" />
            Progress Over Time
          </h2>
          <p className="text-sm text-text-secondary">{activeStudent?.name}&apos;s real sessions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-accent-primary mr-2"></div>
            <span className="text-xs font-mono text-text-muted">WPM</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-status-good mr-2"></div>
            <span className="text-xs font-mono text-text-muted">ACCURACY</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-text-muted">Loading history…</div>
        ) : points.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm text-text-muted">
              No sessions yet for {activeStudent?.name}. Run a live reading session and real
              history will plot here automatically.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12, fontFamily: "monospace" }}
                dy={10}
              />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="wpm"
                stroke="var(--accent-primary-dark)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                stroke="var(--status-good)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
