package com.sonic.insight;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;

class InsightApiTest extends IntegrationTest {

    private static final Insight.Content CONTENT = new Insight.Content(
            "Solid month.",
            List.of("Consistent", "Bench up", "Ran more"),
            new Insight.Trends("Volume rising", "3x a week", null),
            List.of(new Insight.Recommendation(Insight.Priority.HIGH, "Add rows", "Balance pushing"),
                    new Insight.Recommendation(Insight.Priority.LOW, "Stretch", "Mobility")),
            List.of(),
            List.of("Row 3x10", "Run 5k", "Sleep 8h"));

    private void logWorkout(String user, Instant date, String name, String category, String sets) throws Exception {
        mvc.perform(post("/api/v1/workouts").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date": "%s", "exercises": [{"name": "%s", "category": "%s", "sets": %s}]}
                                """.formatted(date, name, category, sets)))
                .andExpect(status().isCreated());
    }

    @Test
    void needsThreeWorkoutsBeforeGenerating() throws Exception {
        String user = newClerkId();
        logWorkout(user, Instant.now(), "Squat", "strength", "[{\"reps\": 5, \"weight\": 100}]");

        mvc.perform(get("/api/v1/insights/latest").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insights").doesNotExist())
                .andExpect(jsonPath("$.canRegenerate").value(false))
                .andExpect(jsonPath("$.message").value("Log at least 3 workouts to get insights."));
        mvc.perform(post("/api/v1/insights").with(as(user)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.type").value("https://sonic.app/problems/not-enough-data"));
    }

    @Test
    void generatesFromSqlAggregatesThenEnforcesTheCooldown() throws Exception {
        String user = newClerkId();
        Instant now = Instant.now();
        logWorkout(user, now.minus(20, ChronoUnit.DAYS), "Bench Press", "strength",
                "[{\"reps\": 10, \"weight\": 60}, {\"reps\": 8, \"weight\": 70}]");
        logWorkout(user, now.minus(3, ChronoUnit.DAYS), "bench press", "strength", "[{\"reps\": 5, \"weight\": 80}]");
        logWorkout(user, now.minus(1, ChronoUnit.DAYS), "Running", "cardio", "[{\"duration\": 0.5, \"distance\": 5}]");
        // Outside the 90-day window: must not count.
        logWorkout(user, now.minus(120, ChronoUnit.DAYS), "Deadlift", "strength", "[{\"reps\": 1, \"weight\": 500}]");
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"%s\", \"weight\": 82}".formatted(now.minus(30, ChronoUnit.DAYS))));
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"%s\", \"weight\": 80.5}".formatted(now.minus(1, ChronoUnit.DAYS))));

        given(insightGenerator.generate(any())).willReturn(CONTENT);

        mvc.perform(post("/api/v1/insights").with(as(user)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.insights.summary").value("Solid month."))
                .andExpect(jsonPath("$.insights.recommendations[0].priority").value("high"))
                .andExpect(jsonPath("$.insights.generatedAt").exists())
                .andExpect(jsonPath("$.canRegenerate").value(false))
                .andExpect(jsonPath("$.canRegenerateAt").exists());

        ArgumentCaptor<TrainingSummary> captor = ArgumentCaptor.forClass(TrainingSummary.class);
        verify(insightGenerator).generate(captor.capture());
        TrainingSummary summary = captor.getValue();
        assertThat(summary.totalSessions()).isEqualTo(3);
        assertThat(summary.totalVolumeKg()).isEqualTo(10 * 60 + 8 * 70 + 5 * 80);
        assertThat(summary.cardioHours()).isEqualTo(0.5);
        assertThat(summary.strengthCount()).isEqualTo(2);
        assertThat(summary.cardioCount()).isEqualTo(1);
        assertThat(summary.topExercises().getFirst()).isEqualTo(new TrainingSummary.TopExercise("bench press", 2, "strength"));
        assertThat(summary.lastTwoWeeks()).isEqualTo(2);
        assertThat(summary.previousTwoWeeks()).isEqualTo(1);
        assertThat(summary.trainingPeriodDays()).isEqualTo(20);
        assertThat(summary.sessionsPerWeek()).isCloseTo(3 * 7 / 20.0, within(0.001));
        assertThat(summary.weightChange()).isEqualTo("80.5 kg (-1.5 kg)");
        assertThat(summary.bodyFatChange()).isNull();

        mvc.perform(get("/api/v1/insights/latest").with(as(user)))
                .andExpect(jsonPath("$.insights.achievements.length()").value(3))
                .andExpect(jsonPath("$.canRegenerate").value(false));

        mvc.perform(post("/api/v1/insights").with(as(user)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.canRegenerateAt").exists());
    }

    @Test
    void sessionsLoggedTodayDoNotBreakTheWeeklyRate() throws Exception {
        String user = newClerkId();
        for (int i = 0; i < 3; i++) {
            logWorkout(user, Instant.now().minusSeconds(60), "Pushups", "strength", "[{\"reps\": 20}]");
        }
        given(insightGenerator.generate(any())).willReturn(CONTENT);

        mvc.perform(post("/api/v1/insights").with(as(user))).andExpect(status().isCreated());

        ArgumentCaptor<TrainingSummary> captor = ArgumentCaptor.forClass(TrainingSummary.class);
        verify(insightGenerator).generate(captor.capture());
        assertThat(captor.getValue().trainingPeriodDays()).isEqualTo(1);
        assertThat(captor.getValue().sessionsPerWeek()).isEqualTo(3.0);
    }

    @Test
    void rejectsIncompleteModelOutput() throws Exception {
        String user = newClerkId();
        for (int i = 0; i < 3; i++) {
            logWorkout(user, Instant.now().minusSeconds(60), "Pushups", "strength", "[{\"reps\": 20}]");
        }
        given(insightGenerator.generate(any())).willReturn(new Insight.Content(
                "Too short", List.of("one"), new Insight.Trends(null, null, null), List.of(), List.of(), List.of()));

        mvc.perform(post("/api/v1/insights").with(as(user))).andExpect(status().isBadGateway());
        mvc.perform(get("/api/v1/insights/latest").with(as(user)))
                .andExpect(jsonPath("$.insights").doesNotExist())
                .andExpect(jsonPath("$.canRegenerate").value(true));
    }

    @Test
    void acceptsImperfectButUsableModelOutput() throws Exception {
        String user = newClerkId();
        for (int i = 0; i < 3; i++) {
            logWorkout(user, Instant.now().minusSeconds(60), "Pushups", "strength", "[{\"reps\": 20}]");
        }
        // Fewer achievements than asked for, a blank item, too many next steps, and a priority
        // word outside the schema: all things a model does.
        given(insightGenerator.generate(any())).willReturn(new Insight.Content(
                " Solid start. ",
                List.of("20 push-ups every session", " "),
                null,
                List.of(new Insight.Recommendation(Insight.Priority.from("Urgent"), "Add pulling work", "Balance")),
                null,
                List.of("1", "2", "3", "4", "5", "6", "7", "8")));

        mvc.perform(post("/api/v1/insights").with(as(user)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.insights.summary").value("Solid start."))
                .andExpect(jsonPath("$.insights.achievements.length()").value(1))
                .andExpect(jsonPath("$.insights.recommendations[0].priority").value("high"))
                .andExpect(jsonPath("$.insights.warnings.length()").value(0))
                .andExpect(jsonPath("$.insights.nextSteps.length()").value(6));
    }
}
