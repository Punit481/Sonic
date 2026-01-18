import { useEffect } from "react";
import { useUserStore } from "../stores/userStore";
import { useDashboardStore } from "../stores/dashboardStore";

export const useDashboardSync = () => {
  const { logs } = useUserStore();
  const { updateAvailableExercises } = useDashboardStore();

  useEffect(() => {
    if (logs && logs.length > 0) {
      updateAvailableExercises(logs);
    }
  }, [logs, updateAvailableExercises]);

  const dashboardState = useDashboardStore();

  return {
    availableExercises: dashboardState.availableExercises,
    selectedExercise: dashboardState.selectedExercise,
    selectedMetricType: dashboardState.selectedMetricType,
    hasExercises: dashboardState.availableExercises.length > 0,
  };
};
