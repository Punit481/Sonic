package com.sonic.voice;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import com.sonic.voice.ParsedVoiceLog.BodyMetrics;
import com.sonic.voice.ParsedVoiceLog.Exercise;
import com.sonic.voice.ParsedVoiceLog.ExerciseSet;
import com.sonic.voice.ParsedVoiceLog.Workout;
import com.sonic.workout.ExerciseCategory;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.MimeType;

class VoiceLogApiTest extends IntegrationTest {

    private static final Workout BENCH = new Workout(
            List.of(new Exercise("bench press", ExerciseCategory.STRENGTH, false, List.of(
                    new ExerciseSet(8, 84.0, null, null, null, null),
                    new ExerciseSet(8, 84.0, null, null, null, null)))),
            null,
            null);

    @Test
    void savesTheWorkoutAndBodyMetricTheModelExtracted() throws Exception {
        String user = newClerkId();
        given(voiceParser.parseText(eq("bench 2 sets of 8 at 185, weighed 80 kilos"), any()))
                .willReturn(new ParsedVoiceLog(null, BENCH, new BodyMetrics(80.0, null, null, null)));

        mvc.perform(post("/api/v1/voice-logs").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"transcript\": \"  bench 2 sets of 8 at 185, weighed 80 kilos \", \"timeZone\": \"Asia/Kolkata\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transcript").value("bench 2 sets of 8 at 185, weighed 80 kilos"))
                .andExpect(jsonPath("$.workout.exercises[0].name").value("bench press"))
                .andExpect(jsonPath("$.workout.exercises[0].aiTagged").value(true))
                .andExpect(jsonPath("$.workout.exercises[0].sets[1].weight").value(84.0))
                .andExpect(jsonPath("$.metric.weight").value(80.0));

        mvc.perform(get("/api/v1/workouts").with(as(user))).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/body-metrics").with(as(user))).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void reportsInputItCouldNotUnderstand() throws Exception {
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(null, null, null));

        mvc.perform(post("/api/v1/voice-logs").with(as(newClerkId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"transcript\": \"what's the weather\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.type").value("https://sonic.app/problems/input-not-understood"))
                .andExpect(jsonPath("$.suggestion").exists());
    }

    @Test
    void validatesWhatTheModelReturnedAndSavesNothingOnFailure() throws Exception {
        String user = newClerkId();
        Workout negativeReps = new Workout(
                List.of(new Exercise("squat", ExerciseCategory.STRENGTH, false,
                        List.of(new ExerciseSet(-5, 100.0, null, null, null, null)))),
                null, null);
        given(voiceParser.parseText(any(), any())).willReturn(new ParsedVoiceLog(null, negativeReps, null));

        mvc.perform(post("/api/v1/voice-logs").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"transcript\": \"squat minus five reps\"}"))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(get("/api/v1/workouts").with(as(user))).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void storesPastMeasurementsOnTheDayTheyWereTaken() throws Exception {
        String user = newClerkId();
        given(voiceParser.parseText(any(), any())).willAnswer(call -> {
            LocalDate today = call.getArgument(1);
            return new ParsedVoiceLog(null, null, new BodyMetrics(79.0, null, null, today.minusDays(1)));
        });

        mvc.perform(post("/api/v1/voice-logs").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"transcript\": \"I weighed 79 yesterday\", \"timeZone\": \"UTC\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.workout").doesNotExist())
                .andExpect(jsonPath("$.metric.date").value(LocalDate.now(java.time.ZoneOffset.UTC).minusDays(1) + "T12:00:00Z"));
    }

    @Test
    void audioUploadIsTranscribedAndLogged() throws Exception {
        String user = newClerkId();
        MockMultipartFile audio = new MockMultipartFile("file", "rec.webm", "audio/webm;codecs=opus", new byte[] {1, 2, 3});
        given(voiceParser.parseAudio(any(), eq(new MimeType("audio", "webm")), any()))
                .willReturn(new ParsedVoiceLog("bench two sets of eight", BENCH, null));

        mvc.perform(multipart("/api/v1/voice-logs/audio").file(audio).with(as(user)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transcript").value("bench two sets of eight"))
                .andExpect(jsonPath("$.workout.exercises[0].sets.length()").value(2));
    }

    @Test
    void audioUploadRejectsNonAudioFiles() throws Exception {
        String user = newClerkId();

        mvc.perform(multipart("/api/v1/voice-logs/audio")
                        .file(new MockMultipartFile("file", "x.txt", "text/plain", new byte[] {1}))
                        .with(as(user)))
                .andExpect(status().isBadRequest());
    }
}
