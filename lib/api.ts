export type Phase1Response = {
  transcript: string;
  words: any[];
  wpm: number;
  hesitations: any[];
  stt_source: 'groq' | 'local';
  latency_ms: Record<string, number>;
  warnings: string[];
};

export type Phase2Response = {
  feedback_text: string;
  engagement_state: 'confident' | 'hesitant';
  comprehension_question: string;
  practice_recommendation: string;
  feedback_source: 'gemini' | 'template';
  latency_ms: Record<string, number>;
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

let apiBaseCache: { 
  baseUrl: string; 
  mode: string; 
  groq_reachable: boolean;
  gemini_reachable: boolean;
  expiresAt: number 
} | null = null;

export async function resolveApiBase() {
  if (apiBaseCache && Date.now() < apiBaseCache.expiresAt) {
    return apiBaseCache;
  }

  // Use relative path if running on same port, or explicit backend URL for dev
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (res.ok) {
      const data = await res.json();
      apiBaseCache = {
        baseUrl,
        mode: data.mode || 'offline',
        groq_reachable: !!data.groq_reachable,
        gemini_reachable: !!data.gemini_reachable,
        expiresAt: Date.now() + 5000,
      };
      return apiBaseCache;
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return { baseUrl, mode: 'offline', groq_reachable: false, gemini_reachable: false };
}

// Helper to construct URL and throw on API errors
async function fetchApi(path: string, options?: RequestInit) {
  const { baseUrl } = await resolveApiBase();
  const res = await fetch(`${baseUrl}${path}`, options);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

export async function createSession(studentId: string, storyId: string, language: string) {
  return fetchApi('/api/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, story_id: storyId, language }),
  });
}

export async function fetchSession(sessionId: string) {
  return fetchApi(`/api/v1/sessions/${sessionId}`);
}

export async function fetchClassDashboard() {
  return fetchApi('/api/v1/students/class/dashboard');
}

export async function fetchStudentsList() {
  return fetchApi('/api/v1/students');
}

export async function fetchAllSessions() {
  return fetchApi('/api/v1/sessions');
}

export async function fetchStudentDashboard(studentId: string) {
  return fetchApi(`/api/v1/students/${studentId}/dashboard`);
}

export async function triggerSync() {
  return fetchApi('/api/v1/sync', { method: 'POST' });
}

export async function analyzeCheckpoint(sessionId: string, checkpointId: string, audioBlob: Blob) {
  const { baseUrl } = await resolveApiBase();
  
  const formData = new FormData();
  // Provide a generic filename to the blob
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('checkpoint_id', checkpointId);

  const res = await fetch(`${baseUrl}/api/v1/sessions/${sessionId}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Analyze error: ${res.status}`);
  }

  return res.json() as Promise<Phase1Response>;
}

export async function fetchFeedback(sessionId: string, checkpointId: string) {
  return fetchApi(`/api/v1/sessions/${sessionId}/feedback/${checkpointId}`) as Promise<Phase2Response>;
}

