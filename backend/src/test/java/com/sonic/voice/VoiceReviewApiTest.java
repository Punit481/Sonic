package com.sonic.voice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import com.sonic.voice.ParsedVoiceLog.Exercise;
import com.sonic.voice.ParsedVoiceLog.ExerciseSet;
import com.sonic.voice.ParsedVoiceLog.Workout;
import com.sonic.workout.ExerciseCategory;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;

class VoiceReviewApiTest extends IntegrationTest {

    private static Workout squats(LocalDate date) {
        return new Workout(
                List.of(new Exercise("squats", ExerciseCategory.STRENGTH, false, List.of(
                        new ExerciseSet(null, 5, 100.0, null, null, null, null)))),
                null, null, date);
    }

    private static String parse(String text) {
        return "{\"transcript\": \"" + text + "\", \"timeZone\": \"UTC\"}";
    }

    @Test
    void parseReturnsADraftWithoutSavingIt() throws Exception {
        String user = newClerkId();
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(squats(null), null));

        mvc.perform(post("/api/v1/voice-logs/parse").with(as(user))
                        .contentType(MediaType.APPLICATION_JSON).content(parse("squats 5 at 100")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript").value("squats 5 at 100"))
                .andExpect(jsonPath("$.workout.exercises[0].name").value("squats"))
                .andExpect(jsonPath("$.workout.exercises[0].sets[0].weight").value(100.0))
                .andExpect(jsonPath("$.metric").doesNotExist());

        mvc.perform(get("/api/v1/workouts").with(as(user))).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void confirmSavesTheEditedDraftWithCanonicalNames() throws Exception {
        String user = newClerkId();
        // The user fixed the reps from 5 to 6 and added a weigh-in before saving.
        String draft = """
                {"transcript": "squats",
                 "workout": {"exercises": [{"name": "squats", "category": "strength",
                                             "sets": [{"reps": 6, "weight": 100}]}]},
                 "metric": {"weight": 80.5}}
                """;

        mvc.perform(post("/api/v1/voice-logs/confirm").with(as(user))
                        .contentType(MediaType.APPLICATION_JSON).content(draft))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.workout.exercises[0].name").value("Squat"))
                .andExpect(jsonPath("$.workout.exercises[0].sets[0].reps").value(6))
                .andExpect(jsonPath("$.metric.weight").value(80.5))
                .andExpect(jsonPath("$.records.length()").value(0));
    }

    @Test
    void confirmNeedsSomethingToSave() throws Exception {
        mvc.perform(post("/api/v1/voice-logs/confirm").with(as(newClerkId()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"transcript\": \"hi\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void workoutsSaidToBeInThePastAreDatedThatDay() throws Exception {
        LocalDate yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1);
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(squats(yesterday), null));

        mvc.perform(post("/api/v1/voice-logs/parse").with(as(newClerkId()))
                        .contentType(MediaType.APPLICATION_JSON).content(parse("yesterday squats")))
                .andExpect(jsonPath("$.workout.date").value(yesterday + "T12:00:00Z"));
    }

    @Test
    void theParserIsToldTheUsersUnitAndExerciseNames() throws Exception {
        String user = newClerkId();
        mvc.perform(patch("/api/v1/me").with(as(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"weightUnit\": \"lb\"}"))
                .andExpect(jsonPath("$.weightUnit").value("lb"));
        mvc.perform(post("/api/v1/workouts").with(as(user)).contentType(MediaType.APPLICATION_JSON).content("""
                {"exercises": [{"name": "bench", "category": "strength", "sets": [{"reps": 5, "weight": 80}]}]}
                """)).andExpect(status().isCreated());
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(squats(null), null));

        mvc.perform(post("/api/v1/voice-logs/parse").with(as(user))
                .contentType(MediaType.APPLICATION_JSON).content(parse("bench 3 by 5 at 185")));

        ArgumentCaptor<VoiceParser.Context> context = ArgumentCaptor.forClass(VoiceParser.Context.class);
        verify(voiceParser).parseText(eq("bench 3 by 5 at 185"), context.capture());
        assertThat(context.getValue().weightUnit()).isEqualTo("lb");
        assertThat(context.getValue().knownExercises()).containsExactly("Bench Press");
    }

    @Test
    void weightUnitMustBeKgOrLb() throws Exception {
        mvc.perform(patch("/api/v1/me").with(as(newClerkId()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"weightUnit\": \"stone\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void identicalSetsWrittenOnceWithACountAreExpanded() throws Exception {
        Workout fiveByFive = new Workout(
                List.of(new Exercise("Squat", ExerciseCategory.STRENGTH, false, List.of(
                        new ExerciseSet(5, 5, 100.0, null, null, null, null),
                        new ExerciseSet(500, 3, 60.0, null, null, null, null)))),
                null, null, null);
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(fiveByFive, null));

        mvc.perform(post("/api/v1/voice-logs/parse").with(as(newClerkId()))
                        .contentType(MediaType.APPLICATION_JSON).content(parse("squats 5 by 5 at 100")))
                // 5 working sets, then a misheard count capped at 20.
                .andExpect(jsonPath("$.workout.exercises[0].sets.length()").value(25))
                .andExpect(jsonPath("$.workout.exercises[0].sets[4].weight").value(100.0))
                .andExpect(jsonPath("$.workout.exercises[0].sets[5].weight").value(60.0));
    }
}
