package com.sonic.workout;

import com.sonic.common.Timestamps;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** All-time bests per exercise, grouped case-insensitively by name. */
@Repository
class ExerciseStatsRepository {

    /**
     * Estimated one-rep max (Epley), only from sets of 1-12 reps where the formula holds up.
     * Bodyweight reps are reps from sets without added weight.
     */
    private static final String BESTS = """
            select lower(e.name) as key,
                   (array_agg(e.name order by w.performed_at desc))[1] as name,
                   (array_agg(e.category order by w.performed_at desc))[1] as category,
                   count(distinct w.id) as sessions,
                   max(w.performed_at) as last_performed,
                   max(s.weight_kg) as best_weight,
                   max(case when s.weight_kg > 0 and s.reps between 1 and 12
                            then s.weight_kg * (1 + s.reps / 30.0) end) as best_e1rm,
                   max(case when coalesce(s.weight_kg, 0) = 0 then s.reps end) as best_reps,
                   max(s.distance_km) as best_distance,
                   max(s.duration_hours) as best_duration
            from exercise e
            join workout_session w on w.id = e.session_id
            join exercise_set s on s.exercise_id = e.id
            where w.user_id = :userId
            """;

    private final JdbcClient jdbc;

    ExerciseStatsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    List<ExerciseStats> all(UUID userId) {
        return jdbc.sql(BESTS + " group by lower(e.name) order by sessions desc, name")
                .param("userId", userId)
                .query((rs, n) -> map(rs))
                .list();
    }

    /** Bests for the named exercises from every session except {@code excludedSession}. */
    Map<String, ExerciseStats> before(UUID userId, Collection<String> names, UUID excludedSession) {
        if (names.isEmpty()) {
            return Map.of();
        }
        return jdbc.sql(BESTS + " and lower(e.name) in (:names) and w.id <> :excluded group by lower(e.name)")
                .param("userId", userId)
                .param("names", names.stream().map(n -> n.toLowerCase(java.util.Locale.ROOT)).toList())
                .param("excluded", excludedSession)
                .query((rs, n) -> map(rs))
                .list()
                .stream()
                .collect(Collectors.toMap(s -> s.name().toLowerCase(java.util.Locale.ROOT), Function.identity()));
    }

    private static ExerciseStats map(java.sql.ResultSet rs) throws java.sql.SQLException {
        Instant last = Timestamps.read(rs, "last_performed");
        return new ExerciseStats(
                rs.getString("name"),
                ExerciseCategory.from(rs.getString("category")),
                rs.getInt("sessions"),
                last,
                Timestamps.readDouble(rs, "best_weight"),
                Timestamps.readDouble(rs, "best_e1rm"),
                rs.getObject("best_reps", Integer.class),
                Timestamps.readDouble(rs, "best_distance"),
                Timestamps.readDouble(rs, "best_duration"));
    }
}
