package com.sonic.insight;

import com.sonic.common.ApiException;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
class GeminiInsightGenerator implements InsightGenerator {

    private static final Logger log = LoggerFactory.getLogger(GeminiInsightGenerator.class);

    private final ChatClient chat;
    private final Resource prompt;

    GeminiInsightGenerator(ChatClient.Builder chat, @Value("classpath:prompts/insights.st") Resource prompt) {
        this.chat = chat.build();
        this.prompt = prompt;
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
                            .param("bodyComposition", bodyComposition.isEmpty() ? "- No body metrics tracked" : bodyComposition))
                    .call()
                    .entity(Insight.Content.class, spec -> spec.useProviderStructuredOutput());
        } catch (RuntimeException ex) {
            log.warn("Gemini insight generation failed", ex);
            throw ApiException.aiUnavailable("Could not generate insights right now. Please try again.");
        }
    }

    private static String fmt(String format, double value) {
        return String.format(Locale.ROOT, format, value);
    }
}
