package com.sonic.goal;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum GoalType {
    /** Heaviest set of an exercise reaches the target, in kg. */
    LIFT_WEIGHT,
    /** Most reps in one bodyweight set of an exercise. */
    EXERCISE_REPS,
    /** Latest body weight reaches the target, in kg, from above or below. */
    BODY_WEIGHT,
    /** Workouts per week. Ongoing: it is met week by week, never "achieved" once. */
    WEEKLY_WORKOUTS;

    @JsonValue
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static GoalType from(String value) {
        return value == null ? null : valueOf(value.toUpperCase(Locale.ROOT));
    }

    boolean needsExercise() {
        return this == LIFT_WEIGHT || this == EXERCISE_REPS;
    }
}
