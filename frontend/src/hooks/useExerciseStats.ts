import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { errorMessage, fetchExercises, type ExerciseStats } from "../lib/api";
import { useUserStore } from "../stores/userStore";

/** All-time bests per exercise, from the server (it sees every workout, not just the loaded 100). */
export function useExerciseStats() {
  const { getToken } = useAuth();
  const logs = useUserStore((s) => s.logs);
  const [stats, setStats] = useState<ExerciseStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetch whenever the user's workouts change (a log, an edit or a delete).
  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => fetchExercises(token))
      .then((data) => !cancelled && setStats(data))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [getToken, logs]);

  return { stats, error };
}
