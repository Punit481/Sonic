import { useMemo } from "react";

interface WorkoutSession {
  id: string;
  date: string | Date;
  exercises: { sets: { weight?: number; reps?: number }[] }[];
}

export interface CalendarData {
  date: string;
  highlight: boolean;
  intensity: "none" | "low" | "medium" | "high";
}

interface CalendarHookResult {
  calendarData: CalendarData[];
  canGoToNextMonth: (currentMonth: number, currentYear: number) => boolean;
  formatDateKey: (date: Date) => string;
}

export const useCalendarData = (
  workoutSessions: WorkoutSession[]
): CalendarHookResult => {
  const calendarData = useMemo(() => {
    const workoutMap = new Map<
      string,
      { highlight: boolean; intensity: "none" | "low" | "medium" | "high" }
    >();

    const formatDateLocal = (date: Date | string): string => {
      const d = date instanceof Date ? date : new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
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

    workoutSessions.forEach((session) => {
      const dateKey = formatDateLocal(session.date);
      const intensity = calculateIntensity(session);
      workoutMap.set(dateKey, { highlight: true, intensity });
    });

    return Array.from(workoutMap.entries()).map(([date, data]) => ({
      date,
      highlight: data.highlight,
      intensity: data.intensity,
    }));
  }, [workoutSessions]);

  const canGoToNextMonth = (
    currentMonth: number,
    currentYear: number
  ): boolean => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const todayMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    return nextMonth <= todayMonth;
  };

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    calendarData,
    canGoToNextMonth,
    formatDateKey,
  };
};
