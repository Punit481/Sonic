package com.sonic.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/**
 * A workout to save, from the API or from a parsed voice log. {@code date} defaults to now.
 * Durations are in hours, weights in kg and distances in km.
 */
public record NewWorkout(
        Instant date,
        @PositiveOrZero Double duration,
        @Size(max = 2000) String note,
        @NotEmpty @Size(max = 50) List<@Valid @NotNull NewExercise> exercises) {

    public record NewExercise(
            @NotBlank @Size(max = 200) String name,
            @NotNull ExerciseCategory category,
            Boolean isCustom,
            @NotEmpty @Size(max = 100) List<@Valid @NotNull NewSet> sets) {}

    public record NewSet(
            @PositiveOrZero Integer reps,
            @PositiveOrZero Double weight,
            @PositiveOrZero Double distance,
            @PositiveOrZero Double duration,
            Intensity intensity,
            @Size(max = 500) String note) {}
}
