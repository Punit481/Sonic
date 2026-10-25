package com.sonic.workout;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A logged workout. Durations are in hours, weights in kg and distances in km. */
public record WorkoutSession(
        UUID id, Instant date, Double duration, String note, Instant createdAt, List<Exercise> exercises) {

    public record Exercise(
            UUID id, String name, ExerciseCategory category, boolean isCustom, boolean aiTagged, List<ExerciseSet> sets) {}

    public record ExerciseSet(
            UUID id, Integer reps, Double weight, Double distance, Double duration, Intensity intensity, String note) {}
}
