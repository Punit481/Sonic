package com.sonic.voice;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.sonic.insight.Insight;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.ai.converter.BeanOutputConverter;

/**
 * Gemini must fill every field the schema marks required. If an optional field became
 * required, the model would invent values, e.g. a 0% body fat reading nobody said.
 */
class GeminiSchemaTest {

    private static List<String> required(Class<?> type, String path) {
        String schema = new BeanOutputConverter<>(type).getJsonSchema();
        Map<String, Object> node = JsonPath.read(schema, path);
        @SuppressWarnings("unchecked")
        List<String> required = (List<String>) node.getOrDefault("required", List.of());
        return required;
    }

    @Test
    void voiceLogLeavesUnsaidValuesOptional() {
        assertThat(required(ParsedVoiceLog.class, "$")).isEmpty();
        assertThat(required(ParsedVoiceLog.class, "$.properties.bodyMetrics")).isEmpty();
        assertThat(required(ParsedVoiceLog.class, "$.properties.workout")).containsExactly("exercises");
        assertThat(required(ParsedVoiceLog.class, "$.properties.workout.properties.exercises.items"))
                .containsExactlyInAnyOrder("name", "category", "sets");
        assertThat(required(ParsedVoiceLog.class, "$.properties.workout.properties.exercises.items.properties.sets.items"))
                .isEmpty();
    }

    @Test
    void insightsRequireEverySectionButNotEveryTrend() {
        assertThat(required(Insight.Content.class, "$")).containsExactlyInAnyOrder(
                "summary", "achievements", "trends", "recommendations", "warnings", "nextSteps");
        assertThat(required(Insight.Content.class, "$.properties.trends")).isEmpty();
    }
}
