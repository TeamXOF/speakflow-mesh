"use client";

/**
 * Practice Center — exercises derived from REAL reading errors (phoneme
 * mismatch frequencies + actually-flagged words + real story sentences).
 * Students see their OWN trouble spots; teachers see the whole class.
 * "Practice in Story Mode" deep-links straight into the story containing
 * the flagged sentence.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Target, Volume2, Play, AlertCircle, TrendingUp, TrendingDown, Sparkles, Trophy } from "lucide-react";
import { fetchPracticeLibrary, PracticeLibrary } from "@/lib/api";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { useSpeakFlowSession } from "@/context/SpeakFlowSessionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { prettyPhoneme } from "@/lib/phonemes";

export default function PracticePage() {
  const router = useRouter();
  const { addNotification } = useSpeakFlow();
  const { startNewSession } = useSpeakFlowSession();
  const { user, isTeacher } = useAuth();
  const [lib, setLib] = useState<PracticeLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLib(await fetchPracticeLibrary());
      } catch (err: any) {
        addNotification({ title: "Error", message: err.message || "Failed to load practice data", type: "error" });
        setLib({ exercises: [], struggling_words: [], total_words_analyzed: 0, scope: "class" });
      } finally {
        setLoading(false);
      }
    })();
  }, [addNotification]);

  const isStudent = !isTeacher && !!user?.student_id;

  /** Jump straight into the story that contains this exercise's sentence. */
  const startPractice = async (ex: PracticeLibrary["exercises"][number]) => {
    if (isStudent && ex.story_id) {
      setLaunching(ex.id);
      const sid = await startNewSession(user!.student_id!, ex.story_id, "en");
      setLaunching(null);
      if (sid) {
        router.push(`/read/${sid}`);
        return;
      }
      addNotification({ title: "Couldn't start that story", message: "Open Story Mode to practice manually.", type: "warning" });
    }
    router.push("/read");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Practice Center</h1>
          <p className="text-sm text-text-secondary mt-1">
            {lib?.scope === "student"
              ? lib?.total_words_analyzed
                ? `Built from ${lib.total_words_analyzed} words you've actually read — your own trouble spots, no generic drills.`
                : "Built from your own reading errors, not generic drills."
              : lib?.total_words_analyzed
              ? `Built from ${lib.total_words_analyzed} really-analyzed words across the class — no generic drills.`
              : "Built from real reading errors, not generic drills."}
          </p>
        </div>
      </div>

      {/* Progress strip — how the student is moving */}
      {lib?.progress && (lib.progress.improving.length + lib.progress.worsening.length +
        lib.progress.new_sounds.length + lib.progress.conquered_words.length) > 0 && (
        <div className="speakflow-card bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-text-primary">Your Progress</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-green-100 bg-green-50 p-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-green-600 mb-1">Getting better</p>
              <p className="text-sm font-bold text-text-primary">
                {lib.progress.improving.length > 0
                  ? lib.progress.improving.map(prettyPhoneme).join(", ")
                  : "Keep practicing to see trends"}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-sky-600 mb-1">New this week</p>
              <p className="text-sm font-bold text-text-primary">
                {lib.progress.new_sounds.length > 0
                  ? lib.progress.new_sounds.map(prettyPhoneme).join(", ")
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Words conquered
              </p>
              <p className="text-sm font-bold text-text-primary" dir="auto">
                {lib.progress.conquered_words.length > 0
                  ? lib.progress.conquered_words.join(", ")
                  : "Miss a word, then master it to see it here"}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="speakflow-card bg-white p-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
        </div>
      ) : (lib?.exercises.length || 0) === 0 ? (
        <div className="speakflow-card bg-white p-16 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-text-muted">
            No practice data yet — once students complete Story Mode checkpoints, their real
            trouble spots become exercises here automatically.
          </p>
          <button
            onClick={() => router.push("/read")}
            className="mt-5 px-5 py-2.5 rounded-xl bg-accent-primary-dark text-white text-sm font-bold hover:bg-accent-primary"
          >
            Go to Story Mode
          </button>
        </div>
      ) : (
        <>
          {/* Sound exercises from real mismatches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {lib!.exercises.map((ex) => (
              <div key={ex.id} className="speakflow-card bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-accent-primary-bg flex items-center justify-center">
                      <Target className="w-5 h-5 text-accent-primary-dark" />
                    </span>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-text-primary text-sm" dir="auto">{prettyPhoneme(ex.focus)}</h3>
                      <p className="text-xs text-text-muted">
                        flagged {ex.frequency}× in real reads
                        {ex.sources?.includes("classic") && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-500 text-[10px] font-bold uppercase">
                            classic
                          </span>
                        )}
                      </p>
                    </div>
                    {ex.trend && ex.trend !== "steady" && (
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        ex.trend === "improving" ? "bg-green-50 border-green-200 text-green-600"
                        : ex.trend === "worsening" ? "bg-red-50 border-red-200 text-red-500"
                        : "bg-sky-50 border-sky-200 text-sky-600"
                      }`}>
                        {ex.trend === "improving" ? <TrendingUp className="w-3 h-3" />
                          : ex.trend === "worsening" ? <TrendingDown className="w-3 h-3" />
                          : <Sparkles className="w-3 h-3" />}
                        {ex.trend}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ex.words.map((w) => (
                    <span key={w} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold">
                      {w}
                    </span>
                  ))}
                </div>
                {ex.sentence && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2">
                    <Volume2 className="w-4 h-4 mt-0.5 text-accent-primary-dark shrink-0" />
                    <p className="text-sm text-text-primary italic">&ldquo;{ex.sentence}&rdquo;</p>
                  </div>
                )}
                <button
                  onClick={() => startPractice(ex)}
                  disabled={launching === ex.id}
                  className="w-full py-2.5 rounded-xl bg-accent-primary-dark text-white text-sm font-bold hover:bg-accent-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {launching === ex.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {launching === ex.id ? "Opening the story…" : "Practice in Story Mode"}
                </button>
              </div>
            ))}
          </div>

          {/* Struggling words leaderboard */}
          <div className="speakflow-card bg-white p-6">
            <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-status-anxious" />
              Most-Missed Words
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              {lib?.scope === "student" ? "Words you've missed most" : "Real counts across all sessions"}
            </p>
            <div className="flex flex-wrap gap-2">
              {lib!.struggling_words.map((w) => (
                <span key={w.word} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-sm font-bold">
                  {w.word} <span className="text-xs opacity-70">×{w.count}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
