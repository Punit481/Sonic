package com.sonic.workout;

import java.time.Instant;

/**
 * An exercise's all-time bests. Weights in kg, distance in km, duration in hours.
 * {@code bestE1rm} is the estimated one-rep max; {@code bestReps} counts bodyweight sets only.
 */
public record ExerciseStats(
        String name,
        ExerciseCategory category,
        int sessions,
        Instant lastPerformed,
        Double bestWeight,
        Double bestE1rm,
        Integer bestReps,
        Double bestDistance,
        Double bestDuration) {}
