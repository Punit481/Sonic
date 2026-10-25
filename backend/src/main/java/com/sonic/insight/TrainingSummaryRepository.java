package com.sonic.insight;

import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.Timestamps;
import com.sonic.insight.TrainingSummary.TopExercise;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Aggregates a user's recent training in Postgres instead of loading every set into memory. */
@Repository
class TrainingSummaryRepository {

    private final JdbcClient jdbc;

    TrainingSummaryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    long countSessions(UUID userId) {
        return jdbc.sql("select count(*) from workout_session where user_id = :userId")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    TrainingSummary summarize(UUID userId, Instant now, Duration lookback) {
        Instant since = now.minus(lookback);
        Map<String, Object> params = Map.of(
                "userId", userId,
                "since", toDb(since),
                "twoWeeksAgo", toDb(now.minus(Duration.ofDays(14))),
                "fourWeeksAgo", toDb(now.minus(Duration.ofDays(28))));

        SessionStats sessions = jdbc.sql("""
                select count(*) as sessions,
                       min(performed_at) as first_session,
                       count(*) filter (where performed_at >= :twoWeeksAgo) as last_two_weeks,
                       count(*) filter (where performed_at >= :fourWeeksAgo and performed_at < :twoWeeksAgo)
                           as previous_two_weeks
                from workout_session
                where user_id = :userId and performed_at >= :since
                """)
                .params(params)
                .query((rs, n) -> new SessionStats(
                        rs.getInt("sessions"),
                        Timestamps.read(rs, "first_session"),
                        rs.getInt("last_two_weeks"),
                        rs.getInt("previous_two_weeks")))
                .single();

        double[] volume = jdbc.sql("""
                select coalesce(sum(st.weight_kg * st.reps), 0) as volume,
                       coalesce(sum(st.duration_hours) filter (where e.category = 'cardio'), 0) as cardio_hours
                from workout_session s
                join exercise e on e.session_id = s.id
                join exercise_set st on st.exercise_id = e.id
                where s.user_id = :userId and s.performed_at >= :since
                """)
                .params(params)
                .query((rs, n) -> new double[] {rs.getDouble("volume"), rs.getDouble("cardio_hours")})
                .single();

        Map<String, Integer> categories = new HashMap<>();
        jdbc.sql("""
                select e.category, count(*) as exercises
                from workout_session s
                join exercise e on e.session_id = s.id
                where s.user_id = :userId and s.performed_at >= :since
                group by e.category
                """)
                .params(params)
                .query(rs -> {
                    categories.put(rs.getString("category"), rs.getInt("exercises"));
                });

        List<TopExercise> topExercises = jdbc.sql("""
                select lower(e.name) as name,
                       count(distinct s.id) as sessions,
                       mode() within group (order by e.category) as category
                from workout_session s
                join exercise e on e.session_id = s.id
                where s.user_id = :userId and s.performed_at >= :since
                group by lower(e.name)
                order by sessions desc, name
                limit 5
                """)
                .params(params)
                .query((rs, n) -> new TopExercise(rs.getString("name"), rs.getInt("sessions"), rs.getString("category")))
                .list();

        // First and latest non-null reading of each measurement in the window.
        Map<String, String> bodyChanges = jdbc.sql("""
                select
                    count(weight_kg) as weight_n,
                    (array_agg(weight_kg order by measured_at) filter (where weight_kg is not null))[1] as weight_first,
                    (array_agg(weight_kg order by measured_at desc) filter (where weight_kg is not null))[1] as weight_last,
                    count(body_fat_pct) as fat_n,
                    (array_agg(body_fat_pct order by measured_at) filter (where body_fat_pct is not null))[1] as fat_first,
                    (array_agg(body_fat_pct order by measured_at desc) filter (where body_fat_pct is not null))[1] as fat_last,
                    count(muscle_mass_kg) as muscle_n,
                    (array_agg(muscle_mass_kg order by measured_at) filter (where muscle_mass_kg is not null))[1] as muscle_first,
                    (array_agg(muscle_mass_kg order by measured_at desc) filter (where muscle_mass_kg is not null))[1] as muscle_last
                from body_metric
                where user_id = :userId and measured_at >= :since
                """)
                .params(params)
                .query((rs, n) -> {
                    Map<String, String> changes = new HashMap<>();
                    changes.put("weight", change(rs.getInt("weight_n"), rs.getDouble("weight_first"), rs.getDouble("weight_last"), "kg"));
                    changes.put("fat", change(rs.getInt("fat_n"), rs.getDouble("fat_first"), rs.getDouble("fat_last"), "%"));
                    changes.put("muscle", change(rs.getInt("muscle_n"), rs.getDouble("muscle_first"), rs.getDouble("muscle_last"), "kg"));
                    return changes;
                })
                .single();

        // At least one day, so sessions logged today don't divide by zero; at least a week for
        // the weekly rate, so one session today doesn't read as "7 per week".
        int periodDays = sessions.firstSession() == null
                ? 1
                : (int) Math.max(1, Math.ceil(Duration.between(sessions.firstSession(), now).toHours() / 24.0));
        double sessionsPerWeek = sessions.count() * 7.0 / Math.max(periodDays, 7);

        return new TrainingSummary(
                (int) lookback.toDays(),
                periodDays,
                sessions.count(),
                sessionsPerWeek,
                volume[0],
                volume[1],
                categories.getOrDefault("strength", 0),
                categories.getOrDefault("cardio", 0),
                categories.getOrDefault("mobility", 0),
                topExercises,
                sessions.lastTwoWeeks(),
                sessions.previousTwoWeeks(),
                bodyChanges.get("weight"),
                bodyChanges.get("fat"),
                bodyChanges.get("muscle"));
    }

    private record SessionStats(int count, Instant firstSession, int lastTwoWeeks, int previousTwoWeeks) {}

    /** "80.0 kg (-1.5 kg)", or null with fewer than two readings. */
    private static String change(int readings, double first, double last, String unit) {
        if (readings < 2) {
            return null;
        }
        double delta = last - first;
        return String.format(Locale.ROOT, "%.1f %s (%s%.1f %s)", last, unit, delta >= 0 ? "+" : "", delta, unit);
    }
}
