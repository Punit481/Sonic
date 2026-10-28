import type { PersonalRecord, WeightUnit } from "../lib/api";
import { formatRecordValue, RECORD_LABEL } from "../lib/records";
import { Icon } from "./Icon";

/** Celebrates personal records a just-saved workout set. */
export default function Records({ records, unit }: { records: PersonalRecord[]; unit: WeightUnit }) {
  if (records.length === 0) return null;
  return (
    <div className="rounded-xl border border-warn/30 bg-gradient-to-br from-warn/15 to-transparent p-4">
      <div className="flex items-center gap-2 font-display font-semibold text-warn">
        <Icon name="trophy" className="size-5" />
        {records.length === 1 ? "New personal record!" : `${records.length} new personal records!`}
      </div>
      <ul className="mt-3 space-y-2">
        {records.map((r) => (
          <li key={`${r.exercise}-${r.kind}`} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
            <span>
              <span className="font-medium">{r.exercise}</span> <span className="text-muted">· {RECORD_LABEL[r.kind]}</span>
            </span>
            <span className="num">
              <span className="font-semibold text-ink">{formatRecordValue(r.kind, r.value, unit)}</span>{" "}
              <span className="text-faint">was {formatRecordValue(r.kind, r.previous, unit)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
