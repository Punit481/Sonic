package com.sonic.workout;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.sonic.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class RecordsApiTest extends IntegrationTest {

    private ResultActions confirm(String user, String exercise, String sets) throws Exception {
        return mvc.perform(post("/api/v1/voice-logs/confirm").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"workout\": {\"exercises\": [{\"name\": \"" + exercise
                        + "\", \"category\": \"strength\", \"sets\": " + sets + "}]}}"));
    }

    @Test
    void heavierSetIsAWeightRecordButTheFirstSessionIsNot() throws Exception {
        String user = newClerkId();
        confirm(user, "Bench Press", "[{\"reps\": 5, \"weight\": 80}]")
                .andExpect(jsonPath("$.records.length()").value(0));

        confirm(user, "bench", "[{\"reps\": 3, \"weight\": 85}]")
                .andExpect(jsonPath("$.records.length()").value(1))
                .andExpect(jsonPath("$.records[0].exercise").value("Bench Press"))
                .andExpect(jsonPath("$.records[0].kind").value("weight"))
                .andExpect(jsonPath("$.records[0].value").value(85.0))
                .andExpect(jsonPath("$.records[0].previous").value(80.0));
    }

    @Test
    void moreRepsAtTheSameWeightIsAnEstimatedMaxRecord() throws Exception {
        String user = newClerkId();
        confirm(user, "Squat", "[{\"reps\": 5, \"weight\": 100}]");

        confirm(user, "Squat", "[{\"reps\": 8, \"weight\": 100}]")
                .andExpect(jsonPath("$.records[0].kind").value("e1rm"));
    }

    @Test
    void bodyweightRepsAreTrackedSeparately() throws Exception {
        String user = newClerkId();
        confirm(user, "Pull Up", "[{\"reps\": 8}]");

        confirm(user, "pullups", "[{\"reps\": 10}]")
                .andExpect(jsonPath("$.records[0].exercise").value("Pull Up"))
                .andExpect(jsonPath("$.records[0].kind").value("reps"))
                .andExpect(jsonPath("$.records[0].value").value(10.0));
    }

    @Test
    void exercisesListAllTimeBests() throws Exception {
        String user = newClerkId();
        confirm(user, "Bench Press", "[{\"reps\": 5, \"weight\": 80}, {\"reps\": 10, \"weight\": 70}]");
        confirm(user, "bench press", "[{\"reps\": 1, \"weight\": 90}]");
        confirm(user, "Pull Up", "[{\"reps\": 12}]");

        mvc.perform(get("/api/v1/exercises").with(as(user)))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Bench Press"))
                .andExpect(jsonPath("$[0].sessions").value(2))
                .andExpect(jsonPath("$[0].bestWeight").value(90.0))
                // 70 kg × 10 reps: 70 × (1 + 10/30) = 93.33, beating 90 × (1 + 1/30) = 93.0
                .andExpect(jsonPath("$[0].bestE1rm").value(org.hamcrest.Matchers.closeTo(93.33, 0.01)))
                .andExpect(jsonPath("$[1].name").value("Pull Up"))
                .andExpect(jsonPath("$[1].bestReps").value(12));
    }

    @Test
    void workoutsCanBeEditedOnlyByTheirOwner() throws Exception {
        String user = newClerkId();
        String body = confirm(user, "Squat", "[{\"reps\": 5, \"weight\": 100}]")
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.workout.id");
        String edited = """
                {"note": "felt easy", "exercises": [
                  {"name": "squat", "category": "strength", "sets": [{"reps": 5, "weight": 102.5}, {"reps": 5, "weight": 102.5}]},
                  {"name": "plank", "category": "mobility", "sets": [{"duration": 0.02}]}]}
                """;

        mvc.perform(put("/api/v1/workouts/" + id).with(as(newClerkId()))
                        .contentType(MediaType.APPLICATION_JSON).content(edited))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/v1/workouts/" + id).with(as(user))
                        .contentType(MediaType.APPLICATION_JSON).content(edited))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workout.note").value("felt easy"))
                .andExpect(jsonPath("$.workout.exercises.length()").value(2))
                .andExpect(jsonPath("$.workout.exercises[0].sets.length()").value(2))
                .andExpect(jsonPath("$.workout.exercises[1].name").value("Plank"))
                .andExpect(jsonPath("$.workout.exercises[0].aiTagged").value(false));
        mvc.perform(get("/api/v1/workouts").with(as(user))).andExpect(jsonPath("$.total").value(1));
    }
}
