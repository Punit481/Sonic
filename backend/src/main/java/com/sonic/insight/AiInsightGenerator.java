package com.sonic.insight;

import com.sonic.common.AiErrors;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Insights are a long reply, and in plain JSON mode the model sometimes drifts out of valid JSON
 * (Groq then answers 400 "Failed to generate JSON"). A strict JSON schema makes the provider
 * constrain the output to exactly the {@link Insight.Content} shape. The schema lives in
 * insights.schema.json because strict mode needs every field listed as required, with nullable
 * types for optional ones, which differs from the schema Spring AI generates.
 */
@Component
class AiInsightGenerator implements InsightGenerator {

    private final ChatClient chat;
    private final Resource prompt;
    private final OpenAiChatModel.ResponseFormat responseFormat;

    AiInsightGenerator(
            ChatClient.Builder chat,
            @Value("classpath:prompts/insights.st") Resource prompt,
            @Value("classpath:prompts/insights.schema.json") Resource schema) throws IOException {
        this.chat = chat.build();
        this.prompt = prompt;
        this.responseFormat = OpenAiChatModel.ResponseFormat.builder()
                .type(OpenAiChatModel.ResponseFormat.Type.JSON_SCHEMA)
                .jsonSchema(schema.getContentAsString(StandardCharsets.UTF_8))
                .strict(true)
                .build();
    }

    @Override
    public Insight.Content generate(TrainingSummary s) {
        String topExercises = IntStream.range(0, s.topExercises().size())
                .mapToObj(i -> {
                    var exercise = s.topExercises().get(i);
                    return "%d. %s - %d sessions (%s)".formatted(i + 1, exercise.name(), exercise.sessions(), exercise.category());
                })
                .collect(Collectors.joining("\n"));
        String bodyComposition = Stream.of(
                        s.weightChange() == null ? null : "- Weight: " + s.weightChange(),
                        s.bodyFatChange() == null ? null : "- Body fat: " + s.bodyFatChange(),
                        s.muscleMassChange() == null ? null : "- Muscle mass: " + s.muscleMassChange())
                .filter(line -> line != null)
                .collect(Collectors.joining("\n"));

        try {
            return chat.prompt()
                    .options(OpenAiChatOptions.builder().responseFormat(responseFormat))
                    .user(user -> user.text(prompt)
                            .param("lookbackDays", s.lookbackDays())
                            .param("trainingPeriodDays", s.trainingPeriodDays())
                            .param("trainingPeriodWeeks", fmt("%.1f", s.trainingPeriodDays() / 7.0))
                            .param("totalSessions", s.totalSessions())
                            .param("sessionsPerWeek", fmt("%.1f", s.sessionsPerWeek()))
                            .param("totalVolumeKg", fmt("%.0f", s.totalVolumeKg()))
                            .param("cardioHours", fmt("%.1f", s.cardioHours()))
                            .param("strengthCount", s.strengthCount())
                            .param("cardioCount", s.cardioCount())
                            .param("mobilityCount", s.mobilityCount())
                            .param("topExercises", topExercises.isEmpty() ? "- none" : topExercises)
                            .param("previousTwoWeeks", s.previousTwoWeeks())
                            .param("lastTwoWeeks", s.lastTwoWeeks())
                            .param("bodyComposition", bodyComposition.isEmpty() ? "- No body metrics tracked" : bodyComposition)
                            .param("goals", s.goals().isEmpty() ? "- No goals set" : String.join("\n", s.goals())))
                    .call()
                    .entity(Insight.Content.class);
        } catch (RuntimeException ex) {
            throw AiErrors.translate("Insight generation", ex, "Could not generate insights right now. Please try again.");
        }
    }

    private static String fmt(String format, double value) {
        return String.format(Locale.ROOT, format, value);
    }
}
