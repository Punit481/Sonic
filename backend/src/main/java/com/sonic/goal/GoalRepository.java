package com.sonic.goal;

import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.Timestamps;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class GoalRepository {

    /** A goal as stored, before progress is worked out. */
    record Row(UUID id, GoalType type, String exercise, double target, Double startValue,
            LocalDate deadline, Instant createdAt, Instant achievedAt) {}

    /** A dated value, for trends: a session's best set, or a weigh-in. */
    record Point(Instant at, double value) {}

    private final JdbcClient jdbc;

    GoalRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    void insert(UUID userId, Row goal) {
        jdbc.sql("""
                insert into goal (id, user_id, type, exercise, target, start_value, deadline, created_at)
                values (:id, :userId, :type, :exercise, :target, :startValue, :deadline, :createdAt)
                """)
                .param("id", goal.id())
                .param("userId", userId)
                .param("type", goal.type().value())
                .param("exercise", goal.exercise())
                .param("target", goal.target())
                .param("startValue", goal.startValue())
                .param("deadline", goal.deadline() == null ? null : Date.valueOf(goal.deadline()))
                .param("createdAt", toDb(goal.createdAt()))
                .update();
    }

    List<Row> findAll(UUID userId) {
        return jdbc.sql("select * from goal where user_id = :userId order by created_at")
                .param("userId", userId)
                .query((rs, n) -> new Row(
                        rs.getObject("id", UUID.class),
                        GoalType.from(rs.getString("type")),
                        rs.getString("exercise"),
                        rs.getDouble("target"),
                        Timestamps.readDouble(rs, "start_value"),
                        rs.getObject("deadline", LocalDate.class),
                        Timestamps.read(rs, "created_at"),
                        Timestamps.read(rs, "achieved_at")))
                .list();
    }

    long countActive(UUID userId) {
        return jdbc.sql("select count(*) from goal where user_id = :userId and achieved_at is null")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    boolean delete(UUID userId, UUID id) {
        return jdbc.sql("delete from goal where id = :id and user_id = :userId")
                .param("id", id)
                .param("userId", userId)
                .update() > 0;
    }

    /** Marks the goal achieved unless it already was. True if this call did it. */
    boolean markAchieved(UUID id, Instant at) {
        return jdbc.sql("update goal set achieved_at = :at where id = :id and achieved_at is null")
                .param("id", id)
                .param("at", toDb(at))
                .update() > 0;
    }

    Optional<Double> bestWeight(UUID userId, String exercise) {
        return optionalDouble("""
                select max(s.weight_kg)
                from exercise e join workout_session w on w.id = e.session_id join exercise_set s on s.exercise_id = e.id
                where w.user_id = :userId and lower(e.name) = lower(:exercise)
                """, userId, exercise);
    }

    Optional<Double> bestBodyweightReps(UUID userId, String exercise) {
        return optionalDouble("""
                select max(s.reps)::double precision
                from exercise e join workout_session w on w.id = e.session_id join exercise_set s on s.exercise_id = e.id
                where w.user_id = :userId and lower(e.name) = lower(:exercise) and coalesce(s.weight_kg, 0) = 0
                """, userId, exercise);
    }

    Optional<Double> latestBodyWeight(UUID userId) {
        return optionalDouble("""
                select weight_kg from body_metric
                where user_id = :userId and weight_kg is not null
                order by measured_at desc limit 1
                """, userId, null);
    }

    /** Each session's best value for the exercise since {@code since}, oldest first. */
    List<Point> exerciseHistory(UUID userId, String exercise, boolean reps, Instant since) {
        String value = reps ? "max(case when coalesce(s.weight_kg, 0) = 0 then s.reps end)" : "max(s.weight_kg)";
        return jdbc.sql("""
                select w.performed_at as at, %s as value
                from exercise e join workout_session w on w.id = e.session_id join exercise_set s on s.exercise_id = e.id
                where w.user_id = :userId and lower(e.name) = lower(:exercise) and w.performed_at >= :since
                group by w.id, w.performed_at
                having %s is not null
                order by w.performed_at
                """.formatted(value, value))
                .param("userId", userId)
                .param("exercise", exercise)
                .param("since", toDb(since))
                .query((rs, n) -> new Point(Timestamps.read(rs, "at"), rs.getDouble("value")))
                .list();
    }

    List<Point> bodyWeightHistory(UUID userId, Instant since) {
        return jdbc.sql("""
                select measured_at as at, weight_kg as value from body_metric
                where user_id = :userId and weight_kg is not null and measured_at >= :since
                order by measured_at
                """)
                .param("userId", userId)
                .param("since", toDb(since))
                .query((rs, n) -> new Point(Timestamps.read(rs, "at"), rs.getDouble("value")))
                .list();
    }

    /** Workouts in each of the last {@code weeks} Monday-to-Sunday weeks in {@code zone}, this week first. */
    int[] weeklyCounts(UUID userId, ZoneId zone, LocalDate thisMonday, int weeks) {
        int[] counts = new int[weeks];
        jdbc.sql("""
                select (date_trunc('week', performed_at at time zone :zone))::date as week, count(*) as n
                from workout_session
                where user_id = :userId and performed_at >= :since
                group by 1
                """)
                .param("zone", zone.getId())
                .param("userId", userId)
                .param("since", toDb(thisMonday.minusWeeks(weeks).atStartOfDay(zone).toInstant()))
                .query(rs -> {
                    LocalDate week = rs.getObject("week", LocalDate.class);
                    long back = java.time.temporal.ChronoUnit.WEEKS.between(week, thisMonday);
                    if (back >= 0 && back < weeks) {
                        counts[(int) back] = rs.getInt("n");
                    }
                });
        return counts;
    }

    private Optional<Double> optionalDouble(String sql, UUID userId, String exercise) {
        var spec = jdbc.sql(sql).param("userId", userId);
        if (exercise != null) {
            spec = spec.param("exercise", exercise);
        }
        // Aggregates return one row, with null when there is nothing yet.
        return spec.query((rs, n) -> {
            Object value = rs.getObject(1);
            return Optional.ofNullable(value == null ? null : ((Number) value).doubleValue());
        }).list().stream().findFirst().flatMap(v -> v);
    }
}
