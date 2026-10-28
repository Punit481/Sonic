// Shapes returned by the Sonic API. Dates arrive as ISO strings.

export type ExerciseCategory = "strength" | "cardio" | "mobility" | "custom";
export type Intensity = "easy" | "moderate" | "hard" | "max";

export interface WorkoutLog {
  id: string;
  date: string | Date;
  duration?: number | null;
  note?: string | null;
  createdAt: string | Date;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  isCustom?: boolean;
  sets: ExerciseSet[];
  aiTagged: boolean;
}

/** Weight in kg, distance in km, duration in hours. */
export interface ExerciseSet {
  id: string;
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  intensity?: Intensity | null;
  note?: string | null;
}

export interface Metric {
  id: string;
  date: string | Date;
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
}
