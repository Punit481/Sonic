package com.sonic.workout;

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.sonic.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class WorkoutApiTest extends IntegrationTest {

    private static final String BENCH_AND_RUN = """
            {
              "date": "2026-10-20T08:00:00Z",
              "duration": 1.25,
              "note": "felt strong",
              "exercises": [
                {"name": "Bench Press", "category": "strength", "isCustom": false,
                 "sets": [{"reps": 8, "weight": 80}, {"reps": 6, "weight": 85, "intensity": "hard"}]},
                {"name": "Plank", "category": "mobility", "sets": [{"reps": 0, "weight": 0, "duration": 0.05}]}
              ]
            }
            """;

    @Test
    void rejectsRequestsWithoutAValidToken() throws Exception {
        mvc.perform(get("/api/v1/workouts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/workouts").header("Authorization", "Bearer nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createsAWorkoutWithExercisesAndSetsInOrder() throws Exception {
        String user = newClerkId();

        String body = mvc.perform(post("/api/v1/workouts").with(as(user))
                        .contentType(MediaType.APPLICATION_JSON).content(BENCH_AND_RUN))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/v1/workouts/")))
                .andExpect(jsonPath("$.date").value("2026-10-20T08:00:00Z"))
                .andExpect(jsonPath("$.duration").value(1.25))
                .andExpect(jsonPath("$.exercises", hasSize(2)))
                .andExpect(jsonPath("$.exercises[0].name").value("Bench Press"))
                .andExpect(jsonPath("$.exercises[0].category").value("strength"))
                .andExpect(jsonPath("$.exercises[0].aiTagged").value(false))
                .andExpect(jsonPath("$.exercises[0].sets[1].weight").value(85.0))
                .andExpect(jsonPath("$.exercises[0].sets[1].intensity").value("hard"))
                // Zero is a real value, not "missing" (the Node server turned it into null).
                .andExpect(jsonPath("$.exercises[1].sets[0].reps").value(0))
                .andExpect(jsonPath("$.exercises[1].sets[0].weight").value(0.0))
                .andReturn().getResponse().getContentAsString();

        String id = JsonPath.read(body, "$.id");
        mvc.perform(get("/api/v1/workouts/" + id).with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[1].name").value("Plank"));
    }

    @Test
    void listsNewestFirstWithPagination() throws Exception {
        String user = newClerkId();
        for (String date : new String[] {"2026-10-01T10:00:00Z", "2026-10-03T10:00:00Z", "2026-10-02T10:00:00Z"}) {
            mvc.perform(post("/api/v1/workouts").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                            .content(BENCH_AND_RUN.replace("2026-10-20T08:00:00Z", date)))
                    .andExpect(status().isCreated());
        }

        mvc.perform(get("/api/v1/workouts?page=1&size=2").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].date").value("2026-10-03T10:00:00Z"))
                .andExpect(jsonPath("$.items[1].date").value("2026-10-02T10:00:00Z"))
                .andExpect(jsonPath("$.items[0].exercises[0].sets", hasSize(2)))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));

        mvc.perform(get("/api/v1/workouts?page=2&size=2").with(as(user)))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].date").value("2026-10-01T10:00:00Z"));
    }

    @Test
    void usersCannotSeeOrDeleteEachOthersWorkouts() throws Exception {
        String owner = newClerkId();
        String other = newClerkId();
        String body = mvc.perform(post("/api/v1/workouts").with(as(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(BENCH_AND_RUN))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        mvc.perform(get("/api/v1/workouts").with(as(other))).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/workouts/" + id).with(as(other))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/workouts/" + id).with(as(other))).andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/workouts/" + id).with(as(owner))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/workouts/" + id).with(as(owner))).andExpect(status().isNotFound());
    }

    @Test
    void rejectsInvalidWorkoutsAsProblemDetails() throws Exception {
        mvc.perform(post("/api/v1/workouts").with(as(newClerkId())).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"exercises": [{"name": "Squat", "category": "strength",
                                                "sets": [{"reps": -3}]}]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", endsWith("problem+json")));

        mvc.perform(post("/api/v1/workouts").with(as(newClerkId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exercises\": []}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void provisionsTheUserFromTokenClaimsOnFirstRequest() throws Exception {
        String user = newClerkId();
        mvc.perform(get("/api/v1/me").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user + "@example.com"))
                .andExpect(jsonPath("$.isPremium").value(false));
    }
}
