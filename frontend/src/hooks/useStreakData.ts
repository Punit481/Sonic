import { useMemo } from "react";

interface WorkoutSession {
  id: string;
  date: string | Date;
  exercises: { sets: { weight?: number; reps?: number }[] }[];
}

export interface StreakDay {
  date: string;
  intensity: "none" | "low" | "medium" | "high";
}

export const useStreakData = (
  workoutSessions: WorkoutSession[]
): StreakDay[] => {
  return useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const calculateIntensity = (
      session: WorkoutSession
    ): "low" | "medium" | "high" | "none" => {
      if (!session.exercises || session.exercises.length === 0) return "none";

      let totalVolume = 0;
      let totalSets = 0;

      session.exercises.forEach((exercise) => {
        if (exercise.sets) {
          exercise.sets.forEach((set) => {
            totalSets++;
            if (set.weight && set.reps) {
              totalVolume += set.weight * set.reps;
            }
          });
        }
      });

      if (totalSets >= 20 || totalVolume >= 5000) return "high";
      if (totalSets >= 10 || totalVolume >= 2000) return "medium";
      return "low";
    };

    const workoutMap = new Map<string, WorkoutSession[]>();
    workoutSessions.forEach((session) => {
      const dateKey = formatDate(
        session.date instanceof Date ? session.date : new Date(session.date)
      );
      const existing = workoutMap.get(dateKey) || [];
      workoutMap.set(dateKey, [...existing, session]);
    });

    return days.map((date) => {
      const dateKey = formatDate(date);
      const workouts = workoutMap.get(dateKey) || [];

      let intensity: "none" | "low" | "medium" | "high" = "none";
      if (workouts.length > 0) {
        const intensities = workouts.map(calculateIntensity);
        if (intensities.includes("high")) intensity = "high";
        else if (intensities.includes("medium")) intensity = "medium";
        else if (intensities.includes("low")) intensity = "low";
      }

      return {
        date: dateKey,
        intensity,
      };
    });
  }, [workoutSessions]);
};
