package com.sonic.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ExportApiTest extends IntegrationTest {

    @Test
    void workoutsExportOneRowPerSetInTheUsersUnitAndTimeZone() throws Exception {
        String user = newClerkId();
        mvc.perform(post("/api/v1/workouts").with(as(user)).contentType(MediaType.APPLICATION_JSON).content("""
                {"date": "2026-10-20T13:00:00Z", "note": "=cmd, \\"quoted\\"",
                 "exercises": [
                   {"name": "bench", "category": "strength", "sets": [{"reps": 5, "weight": 100}, {"reps": 5, "weight": 100}]},
                   {"name": "run", "category": "cardio", "sets": [{"distance": 5, "duration": 0.5}]}]}
                """)).andExpect(status().isCreated());
        mvc.perform(patch("/api/v1/me").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"weightUnit\": \"lb\"}"));

        String csv = mvc.perform(get("/api/v1/export/workouts.csv?timeZone=Asia/Kolkata").with(as(user)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment; filename=\"sonic-workouts-")))
                .andReturn().getResponse().getContentAsString();

        assertThat(csv.split("\r\n")).containsExactly(
                "date,exercise,category,set,reps,weight_lb,distance_km,duration_min,intensity,set_note,workout_note",
                // 13:00 UTC is 18:30 in India; 100 kg is 220.46 lb; the note can't run as a formula.
                "2026-10-20 18:30,Bench Press,strength,1,5,220.46,,,,,\"'=cmd, \"\"quoted\"\"\"",
                "2026-10-20 18:30,Bench Press,strength,2,5,220.46,,,,,\"'=cmd, \"\"quoted\"\"\"",
                "2026-10-20 18:30,Running,cardio,1,,,5,30,,,\"'=cmd, \"\"quoted\"\"\"");
    }

    @Test
    void bodyMetricsExportAndOnlyYourOwnData() throws Exception {
        String user = newClerkId();
        mvc.perform(post("/api/v1/body-metrics").with(as(user)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"2026-10-20T02:00:00Z\", \"weight\": 80.25, \"bodyFat\": 17.5}"));

        String csv = mvc.perform(get("/api/v1/export/body-metrics.csv").with(as(user)))
                .andReturn().getResponse().getContentAsString();
        assertThat(csv.split("\r\n")).containsExactly(
                "date,weight_kg,body_fat_pct,muscle_mass_kg",
                "2026-10-20 02:00,80.25,17.5,");

        String other = mvc.perform(get("/api/v1/export/body-metrics.csv").with(as(newClerkId())))
                .andReturn().getResponse().getContentAsString();
        assertThat(other.split("\r\n")).hasSize(1);
    }
}
