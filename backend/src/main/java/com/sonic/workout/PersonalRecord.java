package com.sonic.workout;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** A best that a workout beat. {@code previous} is the old best, in the same unit as {@code value}. */
public record PersonalRecord(String exercise, Kind kind, double value, double previous) {

    public enum Kind {
        /** Heaviest set, kg. */
        WEIGHT,
        /** Estimated one-rep max, kg. Only reported when the heaviest weight wasn't beaten. */
        E1RM,
        /** Most reps in a bodyweight set. */
        REPS,
        /** Longest distance, km. */
        DISTANCE,
        /** Longest single effort, hours. */
        DURATION;

        @JsonValue
        public String value() {
            return name().toLowerCase(Locale.ROOT);
        }
    }
}
