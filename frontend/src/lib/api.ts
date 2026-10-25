import type { Metric, WorkoutLog } from "../stores/types";

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
};

export const createApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/** An RFC 7807 problem response from the API. */
export interface Problem {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  [extra: string]: unknown;
}

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail || problem.title || `Request failed (${problem.status})`);
    this.problem = problem;
  }

  get status() {
    return this.problem.status;
  }
}

async function request<T>(
  path: string,
  token: string | null | undefined,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(createApiUrl(path), { ...init, headers });
  if (!response.ok) {
    const problem = await response
      .json()
      .catch(() => ({ status: response.status }));
    throw new ApiError({ ...problem, status: response.status });
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Me {
  id: string;
  email: string | null;
  name: string | null;
  isPremium: boolean;
}

export interface VoiceLogResult {
  transcript: string | null;
  workout: WorkoutLog | null;
  metric: Metric | null;
}

const userTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const fetchMe = (token?: string | null) => request<Me>("/api/v1/me", token);

export const fetchWorkouts = (token?: string | null, size = 100) =>
  request<Page<WorkoutLog>>(`/api/v1/workouts?size=${size}`, token);

export const fetchBodyMetrics = (token?: string | null, size = 100) =>
  request<Page<Metric>>(`/api/v1/body-metrics?size=${size}`, token);

/** The saved transcript, or "" if there is none. */
export const fetchDraft = async (token?: string | null): Promise<string> => {
  try {
    const draft = await request<{ text: string }>("/api/v1/workout-draft", token);
    return draft.text;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return "";
    }
    throw error;
  }
};

export const saveDraft = (token: string | null | undefined, text: string) =>
  request<{ text: string }>("/api/v1/workout-draft", token, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });

export const deleteDraft = (token?: string | null) =>
  request<void>("/api/v1/workout-draft", token, { method: "DELETE" });

export const logVoiceText = (token: string | null | undefined, transcript: string) =>
  request<VoiceLogResult>("/api/v1/voice-logs", token, {
    method: "POST",
    body: JSON.stringify({ transcript, timeZone: userTimeZone() }),
  });

const audioExtension = (type: string) =>
  type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";

/** The server transcribes and parses the recording in one call. */
export const logVoiceAudio = (token: string | null | undefined, audio: Blob) => {
  const form = new FormData();
  form.append("file", audio, `recording.${audioExtension(audio.type)}`);
  form.append("timeZone", userTimeZone());
  return request<VoiceLogResult>("/api/v1/voice-logs/audio", token, {
    method: "POST",
    body: form,
  });
};

export const deleteWorkout = (token: string | null | undefined, id: string) =>
  request<void>(`/api/v1/workouts/${id}`, token, { method: "DELETE" });

export const deleteBodyMetric = (token: string | null | undefined, id: string) =>
  request<void>(`/api/v1/body-metrics/${id}`, token, { method: "DELETE" });

/** A message fit to show the user, from an API problem or any other failure. */
export const errorMessage = (error: unknown, fallback = "Something went wrong. Please try again.") => {
  if (error instanceof ApiError) {
    const suggestion = typeof error.problem.suggestion === "string" ? ` ${error.problem.suggestion}` : "";
    return (error.problem.detail || error.problem.title || fallback) + suggestion;
  }
  if (error instanceof TypeError) {
    return "Can't reach the Sonic server. Is the backend running?";
  }
  return fallback;
};

export const fetchInsights = (token?: string | null) =>
  request<InsightStatus>("/api/v1/insights/latest", token);

export const generateInsights = (token?: string | null) =>
  request<InsightStatus>("/api/v1/insights", token, { method: "POST" });

export interface InsightStatus {
  insights: {
    summary: string;
    achievements: string[];
    trends: { volume?: string; frequency?: string; bodyComposition?: string };
    recommendations: {
      priority: "high" | "medium" | "low";
      action: string;
      reasoning: string;
    }[];
    warnings: string[];
    nextSteps: string[];
    generatedAt: string;
  } | null;
  canRegenerate: boolean;
  canRegenerateAt: string | null;
  message: string | null;
}
