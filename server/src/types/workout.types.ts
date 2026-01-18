import { ExerciseCategory, Intensity } from "@prisma/client";

export interface WorkoutSession {
  parsedJson: ParsedWorkoutData;
  date?: string;
  duration?: number;
  note?: string;
  rawText?: string;
}

export interface ParsedWorkoutData {
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  category: ExerciseCategory;
  isCustom?: boolean;
  sets: ExerciseSet[];
  aiTagged: boolean;
}

export interface ExerciseSet {
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  intensity?: Intensity | null;
  note?: string | null;
}
