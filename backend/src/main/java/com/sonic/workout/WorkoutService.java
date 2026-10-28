package com.sonic.workout;

import com.sonic.common.PageRequest;
import com.sonic.common.PageResponse;
import com.sonic.workout.PersonalRecord.Kind;
import com.sonic.workout.WorkoutSession.Exercise;
import com.sonic.workout.WorkoutSession.ExerciseSet;
import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.ToDoubleFunction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkoutService {

    private final WorkoutRepository workouts;
    private final ExerciseStatsRepository stats;
    private final Clock clock;

    WorkoutService(WorkoutRepository workouts, ExerciseStatsRepository stats, Clock clock) {
        this.workouts = workouts;
        this.stats = stats;
        this.clock = clock;
    }

    /** A saved workout and the personal records it set. */
    public record Saved(WorkoutSession workout, List<PersonalRecord> records) {}

    @Transactional
    public Saved create(UUID userId, NewWorkout workout, boolean aiTagged) {
        UUID id = workouts.insert(userId, workout, aiTagged, clock.instant());
        WorkoutSession saved = workouts.findById(userId, id).orElseThrow();
        return new Saved(saved, newRecords(userId, saved));
    }

    @Transactional
    public Optional<Saved> update(UUID userId, UUID sessionId, NewWorkout workout) {
        if (!workouts.update(userId, sessionId, workout)) {
            return Optional.empty();
        }
        WorkoutSession saved = workouts.findById(userId, sessionId).orElseThrow();
        return Optional.of(new Saved(saved, newRecords(userId, saved)));
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkoutSession> list(UUID userId, PageRequest page) {
        return PageResponse.of(workouts.findPage(userId, page), page, workouts.countByUser(userId));
    }

    @Transactional(readOnly = true)
    public Optional<WorkoutSession> find(UUID userId, UUID sessionId) {
        return workouts.findById(userId, sessionId);
    }

    @Transactional
    public boolean delete(UUID userId, UUID sessionId) {
        return workouts.delete(userId, sessionId);
    }

    @Transactional(readOnly = true)
    public List<ExerciseStats> exerciseStats(UUID userId) {
        return stats.all(userId);
    }

    /** Names this user has logged before, most used first. Given to the AI so it reuses them. */
    @Transactional(readOnly = true)
    public List<String> knownExerciseNames(UUID userId) {
        return workouts.exerciseNames(userId, 60);
    }

    /**
     * Bests in this session that beat every other session. An exercise done for the first time
     * sets no record: there is nothing to beat yet.
     */
    private List<PersonalRecord> newRecords(UUID userId, WorkoutSession session) {
        Map<String, List<ExerciseSet>> setsByName = new LinkedHashMap<>();
        Map<String, String> displayName = new LinkedHashMap<>();
        for (Exercise exercise : session.exercises()) {
            String key = exercise.name().toLowerCase(Locale.ROOT);
            displayName.putIfAbsent(key, exercise.name());
            setsByName.computeIfAbsent(key, k -> new ArrayList<>()).addAll(exercise.sets());
        }
        Map<String, ExerciseStats> before = stats.before(userId, displayName.values(), session.id());

        List<PersonalRecord> records = new ArrayList<>();
        setsByName.forEach((key, sets) -> {
            ExerciseStats previous = before.get(key);
            if (previous == null) {
                return;
            }
            String name = displayName.get(key);
            boolean heavier = beat(records, name, Kind.WEIGHT, best(sets, s -> nz(s.weight())), previous.bestWeight());
            if (!heavier) {
                beat(records, name, Kind.E1RM, best(sets, WorkoutService::e1rm), previous.bestE1rm());
            }
            beat(records, name, Kind.REPS, best(sets, s -> nz(s.weight()) == 0 ? nz(s.reps()) : 0),
                    previous.bestReps() == null ? null : previous.bestReps().doubleValue());
            beat(records, name, Kind.DISTANCE, best(sets, s -> nz(s.distance())), previous.bestDistance());
            beat(records, name, Kind.DURATION, best(sets, s -> nz(s.duration())), previous.bestDuration());
        });
        return records;
    }

    private static boolean beat(List<PersonalRecord> records, String name, Kind kind, double value, Double previous) {
        if (previous == null || value <= 0 || value <= previous + 1e-9) {
            return false;
        }
        records.add(new PersonalRecord(name, kind, value, previous));
        return true;
    }

    private static double best(List<ExerciseSet> sets, ToDoubleFunction<ExerciseSet> metric) {
        return sets.stream().filter(Objects::nonNull).mapToDouble(metric).max().orElse(0);
    }

    /** Epley, matching ExerciseStatsRepository: weight × (1 + reps / 30), for 1-12 reps. */
    private static double e1rm(ExerciseSet set) {
        double weight = nz(set.weight());
        double reps = nz(set.reps());
        return weight > 0 && reps >= 1 && reps <= 12 ? weight * (1 + reps / 30.0) : 0;
    }

    private static double nz(Number value) {
        return value == null ? 0 : value.doubleValue();
    }
}
