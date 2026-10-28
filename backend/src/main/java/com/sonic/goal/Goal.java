package com.sonic.goal;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A goal with its progress. Weights are in kg. {@code percent} runs 0-1 from {@code startValue}
 * to {@code target}. For weekly goals, {@code current} is this week's workouts and
 * {@code streakWeeks} counts consecutive weeks that met the target.
 */
public record Goal(
        UUID id,
        GoalType type,
        String exercise,
        double target,
        Double startValue,
        Double current,
        double percent,
        LocalDate deadline,
        Instant createdAt,
        Instant achievedAt,
        Status status,
        LocalDate projectedDate,
        Integer streakWeeks) {

    public enum Status {
        /** Reached (lift, reps, body weight). */
        ACHIEVED,
        /** This week's target is met (weekly goals). */
        MET,
        /** Progress so far keeps pace with the deadline, or the trend gets there in time. */
        ON_TRACK,
        /** Behind the pace the deadline needs. */
        BEHIND,
        /** The deadline passed before the goal was reached. */
        MISSED,
        /** No deadline, still working on it. */
        IN_PROGRESS;

        @com.fasterxml.jackson.annotation.JsonValue
        public String value() {
            return name().toLowerCase(java.util.Locale.ROOT);
        }
    }
}
