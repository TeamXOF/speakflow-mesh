export async function resolveApiBase() {
  return { baseUrl: 'http://localhost:8000', mode: 'online' };
}

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
