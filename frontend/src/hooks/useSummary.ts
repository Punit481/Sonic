import { useMemo } from "react";

import { getCardioDuration, getSessionCount, getVolume } from "../lib/summary";
import { useUserStore } from "../stores/userStore";

export function useSummary() {
  const { logs } = useUserStore();
  const summary = useMemo(
    () => ({
      volume: getVolume(logs, 7),
      duration: getCardioDuration(logs, 7),
      sessions: getSessionCount(logs, 7),
    }),
    [logs]
  );

  return summary;
}
