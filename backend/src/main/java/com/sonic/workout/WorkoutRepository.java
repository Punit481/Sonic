package com.sonic.workout;

import static com.sonic.common.Timestamps.readDouble;
import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.PageRequest;
import com.sonic.common.Timestamps;
import com.sonic.workout.WorkoutSession.Exercise;
import com.sonic.workout.WorkoutSession.ExerciseSet;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class WorkoutRepository {

    private final JdbcClient jdbc;
    private final NamedParameterJdbcTemplate batch;

    WorkoutRepository(JdbcClient jdbc, NamedParameterJdbcTemplate batch) {
        this.jdbc = jdbc;
        this.batch = batch;
    }

    /** Inserts the session, its exercises and their sets: three statements, two of them batched. */
    UUID insert(UUID userId, NewWorkout workout, boolean aiTagged, Instant now) {
        UUID sessionId = UUID.randomUUID();
        jdbc.sql("""
                insert into workout_session (id, user_id, performed_at, duration_hours, note)
                values (:id, :userId, :performedAt, :duration, :note)
                """)
                .param("id", sessionId)
                .param("userId", userId)
                .param("performedAt", toDb(workout.date() != null ? workout.date() : now))
                .param("duration", workout.duration())
                .param("note", workout.note())
                .update();

        List<SqlParameterSource> exerciseRows = new ArrayList<>();
        List<SqlParameterSource> setRows = new ArrayList<>();
        for (int i = 0; i < workout.exercises().size(); i++) {
            NewWorkout.NewExercise exercise = workout.exercises().get(i);
            UUID exerciseId = UUID.randomUUID();
            exerciseRows.add(new MapSqlParameterSource()
                    .addValue("id", exerciseId)
                    .addValue("sessionId", sessionId)
                    .addValue("position", i)
                    .addValue("name", exercise.name().strip())
                    .addValue("category", exercise.category().value())
                    .addValue("isCustom", Boolean.TRUE.equals(exercise.isCustom()))
                    .addValue("aiTagged", aiTagged));
            for (int j = 0; j < exercise.sets().size(); j++) {
                NewWorkout.NewSet set = exercise.sets().get(j);
                setRows.add(new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("exerciseId", exerciseId)
                        .addValue("position", j)
                        .addValue("reps", set.reps())
                        .addValue("weight", set.weight())
                        .addValue("distance", set.distance())
                        .addValue("duration", set.duration())
                        .addValue("intensity", set.intensity() == null ? null : set.intensity().value())
                        .addValue("note", set.note()));
            }
        }

        batch.batchUpdate("""
                insert into exercise (id, session_id, position, name, category, is_custom, ai_tagged)
                values (:id, :sessionId, :position, :name, :category, :isCustom, :aiTagged)
                """, exerciseRows.toArray(SqlParameterSource[]::new));
        batch.batchUpdate("""
                insert into exercise_set
                    (id, exercise_id, position, reps, weight_kg, distance_km, duration_hours, intensity, note)
                values (:id, :exerciseId, :position, :reps, :weight, :distance, :duration, :intensity, :note)
                """, setRows.toArray(SqlParameterSource[]::new));
        return sessionId;
    }

    long countByUser(UUID userId) {
        return jdbc.sql("select count(*) from workout_session where user_id = :userId")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    List<WorkoutSession> findPage(UUID userId, PageRequest page) {
        List<SessionRow> sessions = jdbc.sql("""
                select * from workout_session
                where user_id = :userId
                order by performed_at desc, created_at desc
                limit :limit offset :offset
                """)
                .param("userId", userId)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query(SessionRow.MAPPER)
                .list();
        return withExercises(sessions);
    }

    Optional<WorkoutSession> findById(UUID userId, UUID sessionId) {
        List<SessionRow> sessions = jdbc.sql("select * from workout_session where id = :id and user_id = :userId")
                .param("id", sessionId)
                .param("userId", userId)
                .query(SessionRow.MAPPER)
                .list();
        return withExercises(sessions).stream().findFirst();
    }

    boolean delete(UUID userId, UUID sessionId) {
        return jdbc.sql("delete from workout_session where id = :id and user_id = :userId")
                .param("id", sessionId)
                .param("userId", userId)
                .update() > 0;
    }

    /** Loads exercises and sets for all sessions with one query each, avoiding N+1 queries. */
    private List<WorkoutSession> withExercises(List<SessionRow> sessions) {
        if (sessions.isEmpty()) {
            return List.of();
        }
        List<UUID> sessionIds = sessions.stream().map(SessionRow::id).toList();
        List<ExerciseRow> exercises = jdbc.sql("""
                select * from exercise where session_id in (:ids) order by session_id, position
                """)
                .param("ids", sessionIds)
                .query(ExerciseRow.MAPPER)
                .list();

        Map<UUID, List<ExerciseSet>> setsByExercise = loadSets(exercises.stream().map(ExerciseRow::id).toList());
        Map<UUID, List<Exercise>> exercisesBySession = exercises.stream().collect(Collectors.groupingBy(
                ExerciseRow::sessionId,
                LinkedHashMap::new,
                Collectors.mapping(row -> row.toExercise(setsByExercise.getOrDefault(row.id(), List.of())),
                        Collectors.toList())));

        return sessions.stream()
                .map(row -> row.toSession(exercisesBySession.getOrDefault(row.id(), List.of())))
                .toList();
    }

    private Map<UUID, List<ExerciseSet>> loadSets(Collection<UUID> exerciseIds) {
        if (exerciseIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<ExerciseSet>> sets = new LinkedHashMap<>();
        jdbc.sql("select * from exercise_set where exercise_id in (:ids) order by exercise_id, position")
                .param("ids", exerciseIds)
                .query(rs -> {
                    UUID exerciseId = rs.getObject("exercise_id", UUID.class);
                    String intensity = rs.getString("intensity");
                    sets.computeIfAbsent(exerciseId, id -> new ArrayList<>()).add(new ExerciseSet(
                            rs.getObject("id", UUID.class),
                            rs.getObject("reps", Integer.class),
                            readDouble(rs, "weight_kg"),
                            readDouble(rs, "distance_km"),
                            readDouble(rs, "duration_hours"),
                            Intensity.from(intensity),
                            rs.getString("note")));
                });
        return sets;
    }

    private record SessionRow(UUID id, Instant date, Double duration, String note, Instant createdAt) {

        static final org.springframework.jdbc.core.RowMapper<SessionRow> MAPPER = (rs, n) -> new SessionRow(
                rs.getObject("id", UUID.class),
                Timestamps.read(rs, "performed_at"),
                readDouble(rs, "duration_hours"),
                rs.getString("note"),
                Timestamps.read(rs, "created_at"));

        WorkoutSession toSession(List<Exercise> exercises) {
            return new WorkoutSession(id, date, duration, note, createdAt, exercises);
        }
    }

    private record ExerciseRow(
            UUID id, UUID sessionId, String name, ExerciseCategory category, boolean isCustom, boolean aiTagged) {

        static final org.springframework.jdbc.core.RowMapper<ExerciseRow> MAPPER = (rs, n) -> new ExerciseRow(
                rs.getObject("id", UUID.class),
                rs.getObject("session_id", UUID.class),
                rs.getString("name"),
                ExerciseCategory.from(rs.getString("category")),
                rs.getBoolean("is_custom"),
                rs.getBoolean("ai_tagged"));

        Exercise toExercise(List<ExerciseSet> sets) {
            return new Exercise(id, name, category, isCustom, aiTagged, sets);
        }
    }
}
