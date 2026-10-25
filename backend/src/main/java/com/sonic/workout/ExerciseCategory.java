package com.sonic.workout;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum ExerciseCategory {
    STRENGTH, CARDIO, MOBILITY, CUSTOM;

    /** The value used in JSON and in the database. */
    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static ExerciseCategory from(String value) {
        return value == null ? null : valueOf(value.toUpperCase(Locale.ROOT));
    }
}
