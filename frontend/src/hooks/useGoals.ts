import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, fetchGoals, type Goal } from "../lib/api";
import { useUserStore } from "../stores/userStore";

/** The user's goals with progress, refreshed whenever workouts or measurements change. */
export function useGoals() {
  const { getToken } = useAuth();
  const logs = useUserStore((s) => s.logs);
  const metrics = useUserStore((s) => s.metrics);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setGoals(await fetchGoals(await getToken()));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [getToken]);

  useEffect(() => {
    void reload();
  }, [reload, logs, metrics]);

  return { goals, error, reload };
}
