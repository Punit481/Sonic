import type { ExerciseStats, PersonalRecord, WeightUnit } from "./api";
import { formatMinutes, formatNumber, formatWeight } from "./stats";

export const RECORD_LABEL: Record<PersonalRecord["kind"], string> = {
  weight: "Heaviest set",
  e1rm: "Est. 1-rep max",
  reps: "Most reps",
  distance: "Longest distance",
  duration: "Longest time",
};

export function formatRecordValue(kind: PersonalRecord["kind"], value: number, unit: WeightUnit) {
  switch (kind) {
    case "weight":
    case "e1rm":
      return formatWeight(value, unit);
    case "reps":
      return `${formatNumber(value)} reps`;
    case "distance":
      return `${formatNumber(value, 2)} km`;
    case "duration":
      return formatMinutes(value * 60);
  }
}

/** The one best worth showing in a list: weight for lifts, reps for bodyweight, distance or time for cardio. */
export function headlineBest(s: ExerciseStats, unit: WeightUnit) {
  if (s.bestWeight) return { label: "Best", value: formatRecordValue("weight", s.bestWeight, unit) };
  if (s.bestReps) return { label: "Most reps", value: formatRecordValue("reps", s.bestReps, unit) };
  if (s.bestDistance) return { label: "Longest", value: formatRecordValue("distance", s.bestDistance, unit) };
  if (s.bestDuration) return { label: "Longest", value: formatRecordValue("duration", s.bestDuration, unit) };
  return null;
}
