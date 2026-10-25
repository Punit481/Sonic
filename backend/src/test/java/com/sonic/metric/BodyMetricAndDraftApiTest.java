package com.sonic.metric;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class BodyMetricAndDraftApiTest extends IntegrationTest {

    @Test
    void createsAndListsBodyMetrics() throws Exception {
        String user = newClerkId();
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\": \"2026-10-01T07:00:00Z\", \"weight\": 81.5}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.weight").value(81.5))
                .andExpect(jsonPath("$.bodyFat").doesNotExist());
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\": \"2026-10-08T07:00:00Z\", \"weight\": 80.9, \"bodyFat\": 18}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/body-metrics").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].weight").value(80.9))
                .andExpect(jsonPath("$.items[0].bodyFat").value(18.0));
    }

    @Test
    void requiresAtLeastOneMeasurement() throws Exception {
        mvc.perform(post("/api/v1/body-metrics").with(as(newClerkId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\": \"2026-10-01T07:00:00Z\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/body-metrics").with(as(newClerkId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bodyFat\": 140}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void savesReplacesAndClearsTheWorkoutDraft() throws Exception {
        String user = newClerkId();
        mvc.perform(get("/api/v1/workout-draft").with(as(user))).andExpect(status().isNotFound());

        mvc.perform(put("/api/v1/workout-draft").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"bench 3 sets\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/workout-draft").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"bench 3 sets of 8 at 80\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/workout-draft").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("bench 3 sets of 8 at 80"));

        mvc.perform(delete("/api/v1/workout-draft").with(as(user))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/workout-draft").with(as(user))).andExpect(status().isNotFound());
    }
}
