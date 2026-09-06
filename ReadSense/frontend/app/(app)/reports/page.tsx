"use client";

/**
 * Reports (teacher) — real per-student progress reports generated from the
 * database. Download produces a real text file; Print opens the print dialog.
 * Students with no session data are honestly listed as having no report yet.
 */

import { useEffect, useState } from "react";
import { FileText, Download, Printer, Loader2, Star, TrendingUp, TrendingDown } from "lucide-react";
import { fetchReports, StudentReport } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

function reportToText(r: StudentReport, generatedAt: string): string {
  const lines = [
    "SPEAKFLOW AI — STUDENT PROGRESS REPORT",
    `Generated: ${generatedAt}`,
    "".padEnd(48, "="),
    `Student : ${r.name} (Grade ${r.grade}, ${r.level})`,
    `Status  : ${r.trend === "improving" ? "On track" : "Needs practice"}`,
    `Stars   : ${r.stars}`,
    `Checkpoints passed: ${r.checkpoints_passed} of ${r.checkpoints_attempted} attempted`,
    `Average accuracy   : ${r.avg_accuracy != null ? r.avg_accuracy + "%" : "—"}`,
    "".padEnd(48, "-"),
    "Recent checkpoints:",
    ...(r.recent_checkpoints.length
      ? r.recent_checkpoints.map((c) =>
          ` • ${c.created_at.slice(0, 10)} — ${c.story_title || c.story_id} (${c.language}) — ${Math.round(c.accuracy)}%, ${c.stars}★`)
      : [" • (none)"]),
    "".padEnd(48, "="),
    "Generated from real Story Mode session data. Screening information only — not a clinical assessment.",
  ];
  return lines.join("\n");
}

export default function ReportsPage() {
  const { addNotification } = useSpeakFlow();
  const [reports, setReports] = useState<StudentReport[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const { isTeacher } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isTeacher) { setLoading(false); return; }  // teacher-only data
    (async () => {
      try {
        const data = await fetchReports();
        setReports(data.reports);
        setGeneratedAt(data.generated_at);
      } catch (err: any) {
        addNotification({ title: "Error", message: err.message || "Failed to load reports", type: "error" });
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [addNotification]);

  const handleDownload = (r: StudentReport) => {
    setBusy(r.student_id);
    try {
      const text = reportToText(r, generatedAt);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speakflow-report-${r.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification({ title: "Download ready", message: `Report for ${r.name} saved.`, type: "success" });
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = (r: StudentReport) => {
    const win = window.open("", "_blank", "width=640,height=800");
    if (!win) return;
    win.document.write(
      `<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;">${reportToText(r, generatedAt)}</pre>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Progress Reports</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real per-student summaries from Story Mode sessions{generatedAt && ` · generated ${generatedAt}`}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="speakflow-card bg-white p-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
        </div>
      ) : (reports?.length || 0) === 0 ? (
        <div className="speakflow-card bg-white p-16 text-center text-text-muted">
          No reports yet — reports appear once students complete Story Mode checkpoints.
        </div>
      ) : (
        <div className="space-y-4">
          {reports!.map((r) => (
            <div key={r.student_id} className="speakflow-card bg-white p-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    {r.trend === "improving"
                      ? <TrendingUp className="w-4 h-4 text-status-complete" />
                      : <TrendingDown className="w-4 h-4 text-status-anxious" />}
                    <h3 className="font-extrabold text-text-primary">{r.name}</h3>
                    <span className="text-xs text-text-muted">Grade {r.grade} · {r.level}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {r.checkpoints_passed}/{r.checkpoints_attempted} checkpoints ·{" "}
                    {r.avg_accuracy != null ? `${r.avg_accuracy}% avg accuracy` : "no accuracy yet"} ·{" "}
                    <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.stars}
                    </span>
                  </p>
                  {r.recent_checkpoints.length > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Latest: {r.recent_checkpoints[0].story_title || r.recent_checkpoints[0].story_id} —{" "}
                      {Math.round(r.recent_checkpoints[0].accuracy)}% on {r.recent_checkpoints[0].created_at.slice(0, 10)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(r)}
                    disabled={busy === r.student_id}
                    className="flex items-center px-4 py-2 border border-gray-200 text-text-secondary text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </button>
                  <button
                    onClick={() => handlePrint(r)}
                    className="flex items-center px-4 py-2 bg-text-primary text-white text-sm font-bold rounded-lg hover:bg-gray-800"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
