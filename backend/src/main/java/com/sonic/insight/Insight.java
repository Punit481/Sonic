package com.sonic.insight;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/** AI coaching feedback on the user's recent training. */
public record Insight(
        String summary,
        List<String> achievements,
        Trends trends,
        List<Recommendation> recommendations,
        List<String> warnings,
        List<String> nextSteps,
        Instant generatedAt) {

    /** Optional in the model's schema: bodyComposition is left out when there is no body data. */
    public record Trends(@Nullable String volume, @Nullable String frequency, @Nullable String bodyComposition) {}

    public record Recommendation(@NotNull Priority priority, @NotBlank String action, @NotBlank String reasoning) {}

    public enum Priority {
        HIGH, MEDIUM, LOW;

        @JsonValue
        public String value() {
            return name().toLowerCase(Locale.ROOT);
        }

        @JsonCreator
        public static Priority from(String value) {
            return value == null ? null : valueOf(value.toUpperCase(Locale.ROOT));
        }
    }

    /** What the model returns, validated before it is saved. */
    public record Content(
            @NotBlank String summary,
            @NotNull @Size(min = 3, max = 6) List<@NotBlank String> achievements,
            @NotNull Trends trends,
            @NotNull @Size(min = 2, max = 5) List<@Valid @NotNull Recommendation> recommendations,
            @NotNull @Size(max = 5) List<@NotBlank String> warnings,
            @NotNull @Size(min = 3, max = 6) List<@NotBlank String> nextSteps) {

        Insight generatedAt(Instant generatedAt) {
            return new Insight(summary, achievements, trends, recommendations, warnings, nextSteps, generatedAt);
        }
    }
}
