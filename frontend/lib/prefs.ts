"use client";

export interface StudentPrefs {
  preferredMic: string | null;
  storyLanguage: "en" | "ur";
  wordTips: boolean;
  biggerText: boolean;
}

const DEFAULT_PREFS: StudentPrefs = {
  preferredMic: null,
  storyLanguage: "en",
  wordTips: true,
  biggerText: false,
};

const PREFS_KEY = "speakflow_student_prefs";

export function loadPrefs(): StudentPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(patch: Partial<StudentPrefs>): StudentPrefs {
  const current = loadPrefs();
  const next = { ...current, ...patch };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // localStorage may fail in private mode
    }
  }
  return next;
}
