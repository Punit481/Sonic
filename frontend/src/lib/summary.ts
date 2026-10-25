import type { WorkoutLog } from "../stores/types";

export const getVolume = (logs: WorkoutLog[], duration: number): number => {
  const cutoffTimestamp = Date.now() - duration * 24 * 60 * 60 * 1000;

  return logs
    .filter((log) => new Date(log.date).getTime() >= cutoffTimestamp)
    .reduce((total, log) => {
      const sessionVolume = log.exercises.reduce((exerciseTotal, exercise) => {
        const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
          return set.weight && set.reps
            ? setTotal + set.weight * set.reps
            : setTotal;
        }, 0);
        return exerciseTotal + exerciseVolume;
      }, 0);
      return total + sessionVolume;
    }, 0);
};

export const getCardioDuration = (
  logs: WorkoutLog[],
  duration: number
): number => {
  const cutoffTimestamp = Date.now() - duration * 24 * 60 * 60 * 1000;

  return logs
    .filter((log) => new Date(log.date).getTime() >= cutoffTimestamp)
    .reduce((total, log) => {
      const sessionCardio = log.exercises
        .filter((exercise) => exercise.category === "cardio")
        .reduce((exerciseTotal, exercise) => {
          const exerciseDuration = exercise.sets.reduce((setTotal, set) => {
            return set.duration ? setTotal + set.duration : setTotal;
          }, 0);
          return exerciseTotal + exerciseDuration;
        }, 0);
      return total + sessionCardio;
    }, 0);
};

export const getSessionCount = (
  logs: WorkoutLog[],
  duration: number
): number => {
  const cutoffTimestamp = Date.now() - duration * 24 * 60 * 60 * 1000;

  return logs.filter((log) => new Date(log.date).getTime() >= cutoffTimestamp)
    .length;
};
