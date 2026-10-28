package com.sonic.goal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.sonic.IntegrationTest;
import com.sonic.insight.Insight;
import com.sonic.insight.TrainingSummary;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class GoalApiTest extends IntegrationTest {

    private ResultActions createGoal(String user, String json) throws Exception {
        return mvc.perform(post("/api/v1/goals").with(as(user)).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions lift(String user, Instant date, String exercise, String sets) throws Exception {
        return mvc.perform(post("/api/v1/voice-logs/confirm").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"workout\": {\"date\": \"" + date + "\", \"exercises\": [{\"name\": \"" + exercise
                        + "\", \"category\": \"strength\", \"sets\": " + sets + "}]}}"));
    }

    private void weighIn(String user, double kg) throws Exception {
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"weight\": " + kg + "}")).andExpect(status().isCreated());
    }

    @Test
    void liftGoalTracksProgressAndIsReachedWhenAWorkoutIsSaved() throws Exception {
        String user = newClerkId();
        lift(user, Instant.now().minus(3, ChronoUnit.DAYS), "Bench Press", "[{\"reps\": 5, \"weight\": 80}]");

        createGoal(user, "{\"type\": \"lift_weight\", \"exercise\": \"bench\", \"target\": 90}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exercise").value("Bench Press"))
                .andExpect(jsonPath("$.startValue").value(80.0))
                .andExpect(jsonPath("$.percent").value(0.0))
                .andExpect(jsonPath("$.status").value("in_progress"));

        lift(user, Instant.now(), "bench press", "[{\"reps\": 5, \"weight\": 85}]")
                .andExpect(jsonPath("$.goalsReached.length()").value(0));
        mvc.perform(get("/api/v1/goals").with(as(user))).andExpect(jsonPath("$[0].percent").value(0.5));

        lift(user, Instant.now(), "Bench Press", "[{\"reps\": 3, \"weight\": 92.5}]")
                .andExpect(jsonPath("$.goalsReached.length()").value(1))
                .andExpect(jsonPath("$.goalsReached[0].status").value("achieved"));

        mvc.perform(get("/api/v1/goals").with(as(user)))
                .andExpect(jsonPath("$[0].status").value("achieved"))
                .andExpect(jsonPath("$[0].percent").value(1.0))
                .andExpect(jsonPath("$[0].achievedAt").exists());
    }

    @Test
    void bodyWeightGoalsWorkInEitherDirection() throws Exception {
        String user = newClerkId();
        weighIn(user, 80);
        createGoal(user, "{\"type\": \"body_weight\", \"target\": 78}").andExpect(jsonPath("$.startValue").value(80.0));

        weighIn(user, 79);
        mvc.perform(get("/api/v1/goals").with(as(user)))
                .andExpect(jsonPath("$[0].current").value(79.0))
                .andExpect(jsonPath("$[0].percent").value(0.5));

        weighIn(user, 77.8);
        mvc.perform(get("/api/v1/goals").with(as(user))).andExpect(jsonPath("$[0].status").value("achieved"));
    }

    @Test
    void weeklyGoalCountsThisWeekAndTheStreak() throws Exception {
        String user = newClerkId();
        Instant lastWeek = LocalDate.now(ZoneOffset.UTC).minusWeeks(1).atTime(12, 0).toInstant(ZoneOffset.UTC);
        lift(user, lastWeek, "Squat", "[{\"reps\": 5, \"weight\": 100}]");
        lift(user, lastWeek.plusSeconds(60), "Squat", "[{\"reps\": 5, \"weight\": 100}]");

        createGoal(user, "{\"type\": \"weekly_workouts\", \"target\": 2, \"timeZone\": \"UTC\"}")
                .andExpect(jsonPath("$.current").value(0.0))
                .andExpect(jsonPath("$.status").value("in_progress"))
                .andExpect(jsonPath("$.streakWeeks").value(1));

        lift(user, Instant.now(), "Squat", "[{\"reps\": 5, \"weight\": 100}]");
        lift(user, Instant.now(), "Squat", "[{\"reps\": 5, \"weight\": 100}]");
        mvc.perform(get("/api/v1/goals?timeZone=UTC").with(as(user)))
                .andExpect(jsonPath("$[0].current").value(2.0))
                .andExpect(jsonPath("$[0].status").value("met"))
                .andExpect(jsonPath("$[0].streakWeeks").value(2));
    }

    @Test
    void aSteadyTrendGivesAProjectedFinishDate() throws Exception {
        String user = newClerkId();
        Instant now = Instant.now();
        lift(user, now.minus(21, ChronoUnit.DAYS), "Deadlift", "[{\"reps\": 5, \"weight\": 120}]");
        lift(user, now.minus(14, ChronoUnit.DAYS), "Deadlift", "[{\"reps\": 5, \"weight\": 125}]");
        lift(user, now.minus(7, ChronoUnit.DAYS), "Deadlift", "[{\"reps\": 5, \"weight\": 130}]");

        // +5 kg a week from 130 reaches 150 in about four weeks.
        String body = createGoal(user, "{\"type\": \"lift_weight\", \"exercise\": \"Deadlift\", \"target\": 150}")
                .andReturn().getResponse().getContentAsString();
        LocalDate projected = LocalDate.parse(JsonPath.read(body, "$.projectedDate"));
        assertThat(projected).isBetween(LocalDate.now().plusDays(25), LocalDate.now().plusDays(32));
    }

    @Test
    void goalsAreValidated() throws Exception {
        String user = newClerkId();
        createGoal(user, "{\"type\": \"lift_weight\", \"target\": 100}").andExpect(status().isBadRequest());
        createGoal(user, "{\"type\": \"weekly_workouts\", \"target\": 2.5}").andExpect(status().isBadRequest());
        createGoal(user, "{\"type\": \"body_weight\", \"target\": -5}").andExpect(status().isBadRequest());
        createGoal(user, "{\"type\": \"body_weight\", \"target\": 75, \"deadline\": \"2020-01-01\"}")
                .andExpect(status().isBadRequest());
        for (int i = 0; i < GoalService.MAX_ACTIVE; i++) {
            createGoal(user, "{\"type\": \"weekly_workouts\", \"target\": 3}").andExpect(status().isCreated());
        }
        createGoal(user, "{\"type\": \"weekly_workouts\", \"target\": 3}").andExpect(status().isBadRequest());
    }

    @Test
    void goalsArePrivateAndCanBeRemoved() throws Exception {
        String user = newClerkId();
        String id = JsonPath.read(createGoal(user, "{\"type\": \"weekly_workouts\", \"target\": 3}")
                .andReturn().getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/v1/goals").with(as(newClerkId()))).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/v1/goals/" + id).with(as(newClerkId()))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/goals/" + id).with(as(user))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/goals").with(as(user))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void theCoachIsToldAboutActiveGoals() throws Exception {
        String user = newClerkId();
        for (int i = 0; i < 3; i++) {
            lift(user, Instant.now().minus(i + 1, ChronoUnit.DAYS), "Squat", "[{\"reps\": 5, \"weight\": 100}]");
        }
        createGoal(user, "{\"type\": \"lift_weight\", \"exercise\": \"squat\", \"target\": 120, \"deadline\": \""
                + LocalDate.now().plusMonths(3) + "\"}");
        given(insightGenerator.generate(any())).willReturn(new Insight.Content("ok", List.of("a"),
                new Insight.Trends(null, null, null),
                List.of(new Insight.Recommendation(Insight.Priority.LOW, "x", "y")), List.of(), List.of("n")));

        mvc.perform(post("/api/v1/insights").with(as(user))).andExpect(status().isCreated());

        ArgumentCaptor<TrainingSummary> summary = ArgumentCaptor.forClass(TrainingSummary.class);
        verify(insightGenerator).generate(summary.capture());
        assertThat(summary.getValue().goals()).singleElement().asString()
                .contains("Squat heaviest set: 100 kg now, target 120 kg", "deadline");
    }
}
