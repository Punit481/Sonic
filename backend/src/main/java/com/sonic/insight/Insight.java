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
import java.util.Objects;
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

        /** Lenient, because this comes from the model: "High", "urgent" and "critical" all work. */
        @JsonCreator
        public static Priority from(String value) {
            if (value == null) {
                return null;
            }
            return switch (value.strip().toLowerCase(Locale.ROOT)) {
                case "high", "urgent", "critical" -> HIGH;
                case "low", "minor" -> LOW;
                default -> MEDIUM;
            };
        }
    }

    /**
     * What the model returns, validated before it is saved. The prompt asks for 3-5 achievements
     * and so on, but models miscount, so only an empty section is rejected; {@link #tidy} trims
     * blanks and caps long lists instead.
     */
    public record Content(
            @NotBlank String summary,
            @NotNull @Size(min = 1, max = 6) List<@NotBlank String> achievements,
            @NotNull Trends trends,
            @NotNull @Size(min = 1, max = 5) List<@Valid @NotNull Recommendation> recommendations,
            @NotNull @Size(max = 5) List<@NotBlank String> warnings,
            @NotNull @Size(min = 1, max = 6) List<@NotBlank String> nextSteps) {

        Content tidy() {
            return new Content(
                    summary == null ? null : summary.strip(),
                    tidy(achievements, 6),
                    trends == null ? new Trends(null, null, null) : trends,
                    recommendations == null ? null : recommendations.stream().filter(Objects::nonNull).limit(5).toList(),
                    warnings == null ? List.of() : tidy(warnings, 5),
                    tidy(nextSteps, 6));
        }

        private static List<String> tidy(List<String> items, int max) {
            return items == null ? null : items.stream()
                    .filter(item -> item != null && !item.isBlank())
                    .map(String::strip)
                    .limit(max)
                    .toList();
        }

        Insight generatedAt(Instant generatedAt) {
            return new Insight(summary, achievements, trends, recommendations, warnings, nextSteps, generatedAt);
        }
    }
}
