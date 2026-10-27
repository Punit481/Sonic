import type { WeightUnit } from "./api";

const KG_PER_LB = 0.45359237;

/** Stored kilograms in the user's unit. */
export const fromKg = (kg: number, unit: WeightUnit) => (unit === "lb" ? kg / KG_PER_LB : kg);

/** A value typed in the user's unit, back to kilograms for storage. */
export const toKg = (value: number, unit: WeightUnit) => (unit === "lb" ? value * KG_PER_LB : value);

/** Rounds to the precision people use for each unit: 0.1 kg, 0.5 lb. */
export const roundWeight = (value: number, unit: WeightUnit) =>
  unit === "lb" ? Math.round(value * 2) / 2 : Math.round(value * 10) / 10;

export const displayWeight = (kg: number, unit: WeightUnit) => roundWeight(fromKg(kg, unit), unit);
