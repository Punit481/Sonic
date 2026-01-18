export interface User {
  id: string;
  fullName: string | null;
  email: string;
  avatar?: string;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: Date;
  duration?: number;
  note?: string;
  createdAt: Date;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  category: "strength" | "cardio" | "mobility" | "custom";
  isCustom?: boolean;
  sets: ExerciseSet[];
  aiTagged: boolean;
}

export interface ExerciseSet {
  id: string;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  intensity?: "easy" | "moderate" | "hard" | "max";
  note?: string;
}

export interface Metric {
  id: string;
  date: Date;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface UserStore {
  // State
  user: User | null;
  isLoggedIn: boolean;
  logs: WorkoutLog[];
  metrics: Metric[];
  isLoading: boolean;
  toProcess: string;
  isPremium: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToProcess: (transcript: string) => void;
  setLoggedIn: (isLoggedIn: boolean) => void;
  fetchLogs: (token?: string) => Promise<void>;
  fetchMetrics: (token?: string) => Promise<void>;
  fetchToProcess: (token?: string) => Promise<void>;
  fetchIsPremium: (token?: string) => Promise<void>;
  addLog: (log: WorkoutLog) => void;
  addMetric: (metric: Metric) => void;
  setLoading: (loading: boolean) => void;
  clearStore: () => void;
}
