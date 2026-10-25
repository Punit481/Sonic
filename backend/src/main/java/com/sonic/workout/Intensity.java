package com.sonic.workout;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum Intensity {
    EASY, MODERATE, HARD, MAX;

    /** The value used in JSON and in the database. */
    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static Intensity from(String value) {
        return value == null ? null : valueOf(value.toUpperCase(Locale.ROOT));
    }
}
