package com.sonic.voice;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.sonic.workout.ExerciseCategory;
import com.sonic.workout.Intensity;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * What the model extracts from a voice log. Spring AI turns these records into Gemini's
 * response schema; {@code @Nullable} fields are optional there, so the model can leave out
 * what wasn't said instead of inventing a value.
 */
public record ParsedVoiceLog(
        @JsonPropertyDescription("Verbatim transcript of the audio. Omit when the input was already text.")
        @Nullable String transcript,
        @JsonPropertyDescription("Omit if the input has no workout data")
        @Nullable Workout workout,
        @JsonPropertyDescription("Omit if the input has no body measurements")
        @Nullable BodyMetrics bodyMetrics) {

    public record Workout(
            List<Exercise> exercises,
            @JsonPropertyDescription("Length of the whole session in hours, only if stated for the whole session")
            @Nullable Double durationHours,
            @Nullable String note) {}

    public record Exercise(
            String name, ExerciseCategory category, @Nullable Boolean isCustom, List<ExerciseSet> sets) {}

    public record ExerciseSet(
            @Nullable Integer reps,
            @JsonPropertyDescription("kg") @Nullable Double weight,
            @JsonPropertyDescription("km") @Nullable Double distance,
            @JsonPropertyDescription("hours") @Nullable Double duration,
            @Nullable Intensity intensity,
            @Nullable String note) {}

    public record BodyMetrics(
            @JsonPropertyDescription("kg") @Nullable Double weight,
            @JsonPropertyDescription("percent") @Nullable Double bodyFat,
            @JsonPropertyDescription("kg") @Nullable Double muscleMass,
            @JsonPropertyDescription("Date the measurement was taken, ISO-8601") @Nullable LocalDate date) {}
}
