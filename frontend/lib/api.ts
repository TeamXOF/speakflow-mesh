import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_ROOT = process.env.NEXT_PUBLIC_API_URL || "";
export const API_BASE_URL = API_ROOT;

export type Role = "teacher" | "student";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: string;
  student_id?: string | null;
  created_at?: string;
}

export type ManagedUser = AuthUser;

const TOKEN_KEY = "speakflow_token";
const USER_KEY = "speakflow_user";
const USER_COOKIE_KEY = "sf_user";
const ACCESS_COOKIE_KEY = "access_token";

let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token?: string | null) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Cookie Helpers ───────────────────────────────────────────────────────────
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 7, path = "/"): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=${path}; SameSite=Lax`;
}

export function deleteCookie(name: string, path = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
}

export function getStoredToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  const cToken = getCookie(ACCESS_COOKIE_KEY) || getCookie("sf_access_token");
  if (cToken) {
    inMemoryAccessToken = cToken;
    return cToken;
  }
  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem(TOKEN_KEY);
    if (local) inMemoryAccessToken = local;
    return local;
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  const cookieVal = getCookie(USER_COOKIE_KEY);
  if (cookieVal) {
    try {
      return JSON.parse(cookieVal);
    } catch {}
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: AuthUser, refreshToken?: string): void {
  if (token) {
    inMemoryAccessToken = token;
    setCookie("sf_access_token", token, 1);
  }
  if (refreshToken) {
    setCookie("sf_refresh_token", refreshToken, 7);
  }
  setCookie(USER_COOKIE_KEY, JSON.stringify(user), 7);
  if (typeof window !== "undefined") {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }
}

export function clearSession(): void {
  inMemoryAccessToken = null;
  deleteCookie(USER_COOKIE_KEY);
  deleteCookie("sf_access_token");
  deleteCookie("sf_refresh_token");
  deleteCookie(ACCESS_COOKIE_KEY);
  deleteCookie("refresh_token");
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

// ── Axios Client & Interceptors ──────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Request interceptor: attach Bearer token if available and guarantee withCredentials
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.withCredentials = true;
    const token = inMemoryAccessToken || getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically refresh on 401 and queue concurrent requests
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = originalRequest.url || "";
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/register");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_ROOT}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshRes.data?.token || refreshRes.data?.access_token;
        if (newAccessToken) {
          inMemoryAccessToken = newAccessToken;
          if (refreshRes.data?.user) {
            storeSession(newAccessToken, refreshRes.data.user);
          }
        }

        processQueue(null, newAccessToken);

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("speakflow:auth-failed"));
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

let apiBaseCache: {
  baseUrl: string;
  mode: string;
  groq_reachable: boolean;
  gemini_reachable: boolean;
  expiresAt: number;
} | null = null;

export async function resolveApiBase() {
  if (apiBaseCache && Date.now() < apiBaseCache.expiresAt) {
    return apiBaseCache;
  }

  const baseUrl = API_ROOT;
  try {
    const res = await apiClient.get("/api/v1/health");
    if (res.status === 200) {
      const data = res.data;
      apiBaseCache = {
        baseUrl,
        mode: data.mode || "offline",
        groq_reachable: !!data.groq_reachable,
        gemini_reachable: !!data.gemini_reachable,
        expiresAt: Date.now() + 5000,
      };
      return apiBaseCache;
    }
  } catch {}

  return { baseUrl, mode: "offline", groq_reachable: false, gemini_reachable: false, expiresAt: 0 };
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let data: any = options.body;
  let headers: Record<string, string> = {};

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      headers = { ...(options.headers as Record<string, string>) };
    }
  }

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // keep raw string if not JSON
    }
  }

  try {
    const res = await apiClient.request<T>({
      url: path,
      method: method as any,
      data,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return res.data;
  } catch (err: any) {
    const errorData = err.response?.data;
    const message =
      errorData?.error?.message ||
      errorData?.detail ||
      err.message ||
      `Request failed with status ${err.response?.status || 500}`;
    throw new Error(message);
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string): Promise<{ token: string; access_token: string; refresh_token: string; user: AuthUser }> {
  const data = await apiRequest<{ token: string; access_token?: string; refresh_token?: string; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const token = data.access_token || data.token;
  storeSession(token, data.user, data.refresh_token);
  return {
    token,
    access_token: token,
    refresh_token: data.refresh_token || "",
    user: data.user,
  };
}

export async function apiRegister(name: string, username: string, password: string): Promise<{ ok: boolean; message: string; status: string }> {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, username, password }),
  });
}

export async function apiRefreshToken(): Promise<{ ok: boolean; token: string; user: AuthUser }> {
  const data = await apiRequest<{ ok: boolean; token: string; access_token?: string; user: AuthUser }>("/api/auth/refresh", {
    method: "POST",
  });
  const token = data.access_token || data.token;
  storeSession(token, data.user);
  return { ok: true, token, user: data.user };
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return apiRequest("/api/auth/me", { method: "GET" });
}

export async function apiLogout(): Promise<{ ok: boolean }> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
  return { ok: true };
}

export async function changePassword(current_password: string, new_password: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export async function fetchUsers(): Promise<ManagedUser[]> {
  return apiRequest("/api/auth/users");
}

export async function approveUser(userId: string): Promise<{ ok: boolean; student_id: string }> {
  return apiRequest(`/api/auth/users/${userId}/approve`, { method: "POST" });
}

export async function rejectUser(userId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/auth/users/${userId}/reject`, { method: "POST" });
}

export async function deleteUserAccount(userId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/auth/users/${userId}`, { method: "DELETE" });
}

// ── Settings & Health ────────────────────────────────────────────────────────
export type SttMode = "auto" | "groq" | "local";
export type AgentModel = "auto" | "gemini-3.5-flash-lite" | "gemma-4-31b-it";

export interface KeysStatus {
  ok?: boolean;
  updated?: string[];
  groq_configured: boolean;
  google_configured: boolean;
  google_key_count?: number;
  env?: string;
  stt_mode: SttMode;
  agent_model: AgentModel;
}

export interface V1Health {
  status: string;
  mode: string;
  groq_reachable: boolean;
  gemini_reachable: boolean;
  version?: string;
}

export interface SyncStatus {
  queued: number;
  cloud_configured: boolean;
  mode?: string;
}

export interface SyncResult {
  synced_count: number;
  failed_count: number;
  queued?: number;
  note?: string;
  ok?: boolean;
}

export async function fetchKeysStatus(): Promise<KeysStatus> {
  return apiRequest("/api/v1/config/keys");
}

export async function saveKeys(payload: {
  groq_api_key?: string;
  google_api_keys?: string;
  stt_mode?: SttMode;
  agent_model?: AgentModel;
}): Promise<KeysStatus> {
  return apiRequest("/api/v1/config/keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchV1Health(): Promise<V1Health> {
  return apiRequest("/api/v1/health");
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  return apiRequest("/api/v1/sync/status");
}

export async function triggerSync(): Promise<SyncResult> {
  return apiRequest("/api/v1/sync", { method: "POST" });
}

// ── V2 Story Sessions ────────────────────────────────────────────────────────
export type Language = "en" | "ur";

export interface Phase1Word {
  word: string;
  correct: boolean;
  score: number;
  phoneme_mismatch: string | null;
  spoken?: string;
  duration_ms?: number;
  probability?: number;
  extra?: boolean;
  missed?: boolean;
}

export interface Phase1Response {
  session_id?: string;
  checkpoint_id?: string;
  phase?: number;
  transcript: string;
  words: Phase1Word[];
  wpm: number;
  accuracy: number;
  passed: boolean;
  stars: number;
  hesitations: any[];
  stt_source: string;
  latency_ms: Record<string, number>;
  warnings: string[];
}

export interface Phase2Response {
  session_id?: string;
  checkpoint_id?: string;
  phase?: number;
  feedback_text: string;
  engagement_state: "confident" | "hesitant" | string;
  comprehension_question?: string;
  practice_recommendation?: string;
  teacher_note?: string;
  feedback_source?: string;
  latency_ms?: Record<string, number>;
  [key: string]: unknown;
}

export interface SessionDetail {
  session_id: string;
  student_id: string;
  student_name: string | null;
  story_id: string;
  story_title?: string;
  story_emoji?: string;
  language: string;
  created_at: string;
  completed_at?: string | null;
  mode?: string;
  synced?: boolean;
  checkpoints: Array<{
    checkpoint_id: string;
    target_text: string;
    status: "attempted" | "pending";
    passed: boolean;
    accuracy: number | null;
    wpm: number | null;
    stars: number;
    transcript: string | null;
    feedback_text: string | null;
    engagement_state: string | null;
    comprehension_question: string | null;
    practice_recommendation: string | null;
    stt_source: string | null;
    feedback_source: string | null;
    hesitations: any[];
    words: Phase1Word[];
  }>;
  totals: {
    checkpoints_total: number;
    checkpoints_attempted: number;
    checkpoints_passed: number;
    stars: number;
    avg_accuracy: number | null;
    is_complete: boolean;
  };
}

export interface V2SessionListItem {
  id: string;
  student_id: string;
  student_name: string | null;
  story_id: string;
  language: string;
  created_at: string;
  completed_at: string | null;
  duration_s: number | null;
  avg_accuracy: number | null;
  stars: number;
  attempted?: number;
  passed?: number;
  synced?: boolean;
}

export async function createSession(studentId: string, storyId: string, language: string) {
  return apiRequest("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, story_id: storyId, language }),
  });
}

export async function analyzeCheckpoint(sessionId: string, checkpointId: string, audioBlob: Blob): Promise<Phase1Response> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");
  formData.append("checkpoint_id", checkpointId);

  return apiRequest(`/api/v1/sessions/${sessionId}/analyze`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchFeedback(sessionId: string, checkpointId: string): Promise<Phase2Response> {
  return apiRequest(`/api/v1/sessions/${sessionId}/feedback/${checkpointId}`);
}

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail> {
  return apiRequest(`/api/v1/sessions/${sessionId}`);
}

export async function fetchV2Sessions(): Promise<V2SessionListItem[]> {
  return apiRequest("/api/v1/sessions");
}

// ── Word Tips ────────────────────────────────────────────────────────────────
export interface WordTip {
  word: string;
  letters: string[];
  syllables: string[];
  tip: string;
  tip_source?: string;
  mouth_cue?: string;
  tongue_cue?: string;
  sound_tip?: string;
}

export async function fetchWordTip(
  word: string,
  lang: string = "en",
  mismatch: string = "",
  spoken: string = ""
): Promise<WordTip> {
  const params = new URLSearchParams({
    word,
    lang,
    mismatch,
    spoken,
  });
  return apiRequest(`/api/v1/words/tip?${params.toString()}`);
}

// ── Story Mode (World Map & Levels) ──────────────────────────────────────────
export type StoryTrack = "en" | "ur";
export type StoryWord = Phase1Word;

export interface StoryMapLevel {
  level: number;
  sentence?: string;
  theme: string;
  difficulty: string;
  boss?: boolean;
  is_boss?: boolean;
  stars: number;
  best_accuracy: number | null;
  attempts: number;
  status?: "completed" | "current" | "locked" | string;
  unlocked: boolean;
  passed?: boolean;
}

export interface StoryMap {
  track: StoryTrack;
  world: number;
  world_name: string;
  levels: StoryMapLevel[];
  unlocked_upto: number;
  total_stars: number;
  next_level: number;
  levels_completed?: number;
}

export interface StoryPlay {
  track: StoryTrack;
  level: number;
  sentence: string;
  theme: string;
  difficulty: string;
  best_stars: number;
  attempts: number;
}

export interface StoryAttemptResult {
  attempt_id: string;
  track: StoryTrack;
  level: number;
  sentence: string;
  theme: string;
  difficulty: string;
  transcript: string;
  words: StoryWord[];
  accuracy: number;
  stars: number;
  passed: boolean;
  wpm: number;
  hesitations: any[];
  engagement_state: string;
  stt_source: string;
  latency_ms: Record<string, number>;
}

export async function fetchStoryMap(track: StoryTrack = "en", world?: number): Promise<StoryMap> {
  const url = `/api/v1/story/map?track=${track}${world ? `&world=${world}` : ""}`;
  return apiRequest(url);
}

export async function fetchStoryPlay(track: StoryTrack, level: number): Promise<StoryPlay> {
  return apiRequest(`/api/v1/story/play?track=${track}&level=${level}`);
}

export async function storyAnalyze(track: StoryTrack, level: number, audioBlob: Blob): Promise<StoryAttemptResult> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");
  formData.append("track", track);
  formData.append("level", String(level));

  return apiRequest("/api/v1/story/analyze", {
    method: "POST",
    body: formData,
  });
}

export async function storyAnalyzeMock(track: StoryTrack, level: number, words: string[]): Promise<StoryAttemptResult> {
  return apiRequest("/api/v1/story/analyze-mock", {
    method: "POST",
    body: JSON.stringify({ track, level, words }),
  });
}

export async function fetchStoryFeedback(attemptId: string): Promise<Phase2Response | null> {
  try {
    return await apiRequest(`/api/v1/story/feedback/${attemptId}`);
  } catch {
    return null;
  }
}

// ── Classic Pipeline & Sessions ──────────────────────────────────────────────
export async function runPipeline(
  studentId: string,
  audioBase64: string,
  targetSentence: string,
  language: string = "en"
): Promise<any> {
  return apiRequest("/pipeline/run", {
    method: "POST",
    body: JSON.stringify({
      student_id: studentId,
      audio_base64: audioBase64,
      target_sentence: targetSentence,
      language,
    }),
  });
}

export async function fetchSessions(studentId?: string): Promise<any[]> {
  const url = studentId ? `/api/sessions/?student_id=${studentId}` : "/api/sessions/";
  return apiRequest(url);
}

export async function fetchSessionDiagnosis(sessionId: string): Promise<any> {
  return apiRequest(`/api/sessions/${sessionId}/diagnosis`);
}

// ── Roster & Students ────────────────────────────────────────────────────────
export interface RosterEntry {
  id: string;
  name: string;
  grade: number;
  level: string;
  checkpoints_passed: number;
  checkpoints_attempted: number;
  stars: number;
  avg_accuracy: number | null;
  last_active: string | null;
  parent_update_enabled: boolean;
  account_username: string | null;
  account_status: string | null;
}

export async function fetchRoster(): Promise<RosterEntry[]> {
  return apiRequest("/api/v1/teacher/roster");
}

export interface StudentFormData {
  name: string;
  grade: number;
  level?: string;
}

export async function createStudent(
  nameOrData: string | StudentFormData,
  grade?: number,
  level: string = "Level 1"
) {
  const body =
    typeof nameOrData === "object"
      ? nameOrData
      : { name: nameOrData, grade: grade ?? 3, level };
  return apiRequest("/api/students/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateStudent(
  studentId: string,
  nameOrData: string | StudentFormData,
  grade?: number,
  level: string = "Level 1"
) {
  const body =
    typeof nameOrData === "object"
      ? nameOrData
      : { name: nameOrData, grade: grade ?? 3, level };
  return apiRequest(`/api/students/${studentId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteStudent(studentId: string) {
  return apiRequest(`/api/students/${studentId}`, {
    method: "DELETE",
  });
}

export interface ParentUpdate {
  enabled: boolean;
  message: string | null;
  student_name?: string;
}

export async function fetchParentMessage(studentId: string): Promise<ParentUpdate> {
  return apiRequest(`/api/v1/students/${studentId}/parent-message`);
}

export async function toggleParentUpdates(studentId: string, enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> {
  return apiRequest(`/api/v1/teacher/students/${studentId}/parent-toggle`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

// ── Classroom Overview & Reports ─────────────────────────────────────────────
export interface ClassroomOverview {
  totals: {
    active_students: number;
    sessions_today: number;
    class_accuracy: number | null;
    stars_awarded: number;
  };
  weekly: Array<{ day: string; accuracy: number; sessions: number }>;
  struggling_areas: Array<{ label: string; count: number; rate: number }>;
  phoneme_heatmap: Array<{ phoneme: string; count: number; rate: number }>;
  words_analyzed: number;
  checkpoint_progress: Array<{
    story_id: string;
    story_title: string;
    story_emoji: string;
    checkpoint_id: string;
    checkpoint_label: string;
    attempted: number;
    passed: number;
    avg_accuracy: number;
  }>;
}

export async function fetchClassroomOverview(): Promise<ClassroomOverview> {
  return apiRequest("/api/v1/classroom/overview");
}

export interface StudentReport {
  student_id: string;
  name: string;
  grade: number;
  level: string;
  trend: "improving" | "needs-practice" | string;
  checkpoints_passed: number;
  checkpoints_attempted: number;
  stars: number;
  avg_accuracy: number | null;
  recent_checkpoints: Array<{
    checkpoint_id: string;
    accuracy: number;
    stars: number;
    created_at: string;
    story_id: string;
    story_title?: string;
    language: string;
  }>;
}

export interface ReportsResponse {
  reports: StudentReport[];
  generated_at: string;
}

export async function fetchReports(): Promise<ReportsResponse> {
  return apiRequest("/api/v1/reports");
}

// ── Student Dashboard ────────────────────────────────────────────────────────
export interface StudentDashboard {
  student: {
    id: string;
    name: string;
    grade: number;
    level: string;
  };
  summary: {
    stars: number;
    checkpoints_passed: number;
    checkpoints_attempted: number;
    avg_accuracy: number | null;
    recent_score: number | null;
    progress_pct: number;
    classic_sessions: number;
    story_sessions: number;
  };
  trend: Array<{ date: string; accuracy: number }>;
  struggling_words: Array<{ word: string; count: number }>;
  phoneme_errors: Array<{ phoneme: string; count: number }>;
  stories: any[];
  recent_sessions: any[];
}

export async function fetchStudentDashboard(studentId: string, range: string = "all"): Promise<StudentDashboard> {
  return apiRequest(`/api/v1/students/${studentId}/dashboard?range=${range}`);
}

// ── Practice Center ──────────────────────────────────────────────────────────
export interface PracticeExercise {
  id: string;
  focus: string;
  frequency: number;
  words: string[];
  story_id: string | null;
  checkpoint_id: string | null;
  sentence: string | null;
  sources: string[];
  trend: "improving" | "worsening" | "new" | "steady";
}

export interface PracticeLibrary {
  exercises: PracticeExercise[];
  struggling_words: Array<{ word: string; count: number }>;
  scope: "student" | "class";
  total_words_analyzed: number;
  progress?: {
    improving: string[];
    worsening: string[];
    new_sounds: string[];
    conquered_words: string[];
  };
}

export async function fetchPracticeLibrary(): Promise<PracticeLibrary> {
  return apiRequest("/api/v1/practice/library");
}
