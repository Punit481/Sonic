package com.sonic.goal;

import com.sonic.common.ApiException;
import com.sonic.goal.Goal.Status;
import com.sonic.goal.GoalRepository.Point;
import com.sonic.goal.GoalRepository.Row;
import com.sonic.workout.ExerciseNames;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoalService {

    static final int MAX_ACTIVE = 10;
    private static final int WEEKS_FOR_STREAK = 52;

    private final GoalRepository goals;
    private final Clock clock;

    GoalService(GoalRepository goals, Clock clock) {
        this.goals = goals;
        this.clock = clock;
    }

    /** {@code target} in kg for weight goals. */
    public record NewGoal(GoalType type, String exercise, double target, LocalDate deadline) {}

    @Transactional
    public Goal create(UUID userId, NewGoal request, ZoneId zone) {
        if (request.type() == null) {
            throw ApiException.badRequest("Choose a goal type.");
        }
        if (!(request.target() > 0) || request.target() > 10_000) {
            throw ApiException.badRequest("The target must be a positive number.");
        }
        String exercise = null;
        if (request.type().needsExercise()) {
            if (request.exercise() == null || request.exercise().isBlank()) {
                throw ApiException.badRequest("Choose the exercise this goal is for.");
            }
            exercise = ExerciseNames.canonical(request.exercise());
        }
        if (request.type() == GoalType.WEEKLY_WORKOUTS && (request.target() > 14 || request.target() != Math.floor(request.target()))) {
            throw ApiException.badRequest("Workouts per week must be a whole number from 1 to 14.");
        }
        Instant now = clock.instant();
        if (request.deadline() != null && !request.deadline().isAfter(LocalDate.ofInstant(now, zone))) {
            throw ApiException.badRequest("The deadline must be in the future.");
        }
        if (goals.countActive(userId) >= MAX_ACTIVE) {
            throw ApiException.badRequest("You can have up to " + MAX_ACTIVE + " active goals. Remove one first.");
        }

        Row row = new Row(UUID.randomUUID(), request.type(), exercise, request.target(),
                currentValue(userId, request.type(), exercise), request.deadline(), now, null);
        goals.insert(userId, row);
        return withProgress(userId, row, zone, now);
    }

    /** Every goal with its progress: active ones first (nearest deadline first), then achieved. */
    @Transactional
    public List<Goal> list(UUID userId, ZoneId zone) {
        Instant now = clock.instant();
        checkAchieved(userId, now);
        return goals.findAll(userId).stream()
                .map(row -> withProgress(userId, row, zone, now))
                .sorted(Comparator.comparing((Goal g) -> g.achievedAt() != null)
                        .thenComparing(Goal::deadline, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Goal::createdAt))
                .toList();
    }

    @Transactional
    public boolean delete(UUID userId, UUID id) {
        return goals.delete(userId, id);
    }

    /** Marks goals reached by the latest data as achieved; returns the ones reached just now. */
    @Transactional
    public List<Goal> checkAchieved(UUID userId, ZoneId zone) {
        Instant now = clock.instant();
        return checkAchieved(userId, now).stream().map(row -> withProgress(userId, row, zone, now)).toList();
    }

    /** One line per active goal, for the AI coach. Weights in kg. */
    @Transactional(readOnly = true)
    public List<String> describeActive(UUID userId, ZoneId zone) {
        Instant now = clock.instant();
        return goals.findAll(userId).stream()
                .filter(row -> row.achievedAt() == null)
                .map(row -> describe(withProgress(userId, row, zone, now)))
                .toList();
    }

    private List<Row> checkAchieved(UUID userId, Instant now) {
        List<Row> reached = new ArrayList<>();
        for (Row row : goals.findAll(userId)) {
            if (row.achievedAt() != null || row.type() == GoalType.WEEKLY_WORKOUTS) {
                continue;
            }
            Double current = currentValue(userId, row.type(), row.exercise());
            if (current != null && reached(row, current) && goals.markAchieved(row.id(), now)) {
                reached.add(new Row(row.id(), row.type(), row.exercise(), row.target(), row.startValue(),
                        row.deadline(), row.createdAt(), now));
            }
        }
        return reached;
    }

    private Double currentValue(UUID userId, GoalType type, String exercise) {
        return switch (type) {
            case LIFT_WEIGHT -> goals.bestWeight(userId, exercise).orElse(null);
            case EXERCISE_REPS -> goals.bestBodyweightReps(userId, exercise).orElse(null);
            case BODY_WEIGHT -> goals.latestBodyWeight(userId).orElse(null);
            case WEEKLY_WORKOUTS -> null;
        };
    }

    /** Body weight can be a goal to lose or to gain, depending on where the user started. */
    private static boolean losing(Row row) {
        return row.type() == GoalType.BODY_WEIGHT && row.startValue() != null && row.target() < row.startValue();
    }

    private static boolean reached(Row row, double current) {
        return losing(row) ? current <= row.target() + 1e-9 : current >= row.target() - 1e-9;
    }

    private Goal withProgress(UUID userId, Row row, ZoneId zone, Instant now) {
        LocalDate today = LocalDate.ofInstant(now, zone);
        if (row.type() == GoalType.WEEKLY_WORKOUTS) {
            LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            int[] weeks = goals.weeklyCounts(userId, zone, monday, WEEKS_FOR_STREAK);
            int target = (int) row.target();
            // This week counts toward the streak once it's met; until then the streak is the weeks before.
            int streak = 0;
            for (int i = weeks[0] >= target ? 0 : 1; i < weeks.length && weeks[i] >= target; i++) {
                streak++;
            }
            Status status = weeks[0] >= target ? Status.MET : Status.IN_PROGRESS;
            return new Goal(row.id(), row.type(), null, row.target(), null, (double) weeks[0],
                    Math.min(1, weeks[0] / row.target()), row.deadline(), row.createdAt(), null, status, null, streak);
        }

        Double current = currentValue(userId, row.type(), row.exercise());
        double percent = percent(row, current);
        LocalDate projected = row.achievedAt() == null ? projectedDate(userId, row, current, now, zone) : null;
        Status status = status(row, percent, projected, today, zone);
        return new Goal(row.id(), row.type(), row.exercise(), row.target(), row.startValue(), current, percent,
                row.deadline(), row.createdAt(), row.achievedAt(), status, projected, null);
    }

    private static double percent(Row row, Double current) {
        if (row.achievedAt() != null) {
            return 1;
        }
        if (current == null) {
            return 0;
        }
        double start = row.startValue() != null ? row.startValue() : 0;
        if (Math.abs(row.target() - start) < 1e-9) {
            return reached(row, current) ? 1 : 0;
        }
        return Math.max(0, Math.min(1, (current - start) / (row.target() - start)));
    }

    private static Status status(Row row, double percent, LocalDate projected, LocalDate today, ZoneId zone) {
        if (row.achievedAt() != null) {
            return Status.ACHIEVED;
        }
        if (row.deadline() == null) {
            return Status.IN_PROGRESS;
        }
        if (today.isAfter(row.deadline())) {
            return Status.MISSED;
        }
        LocalDate created = LocalDate.ofInstant(row.createdAt(), zone);
        long total = Math.max(1, ChronoUnit.DAYS.between(created, row.deadline()));
        double expected = Math.min(1, (double) ChronoUnit.DAYS.between(created, today) / total);
        boolean trendMakesIt = projected != null && !projected.isAfter(row.deadline());
        // A little slack: a week of normal day-to-day noise shouldn't flip a goal to "behind".
        return trendMakesIt || percent + 0.1 >= expected ? Status.ON_TRACK : Status.BEHIND;
    }

    /**
     * When the recent trend reaches the target: a least-squares line through the last 90 days of
     * session bests or weigh-ins. Null without a clear trend in the right direction (at least 3
     * points over a week), or if it's more than three years away.
     */
    private LocalDate projectedDate(UUID userId, Row row, Double current, Instant now, ZoneId zone) {
        if (current == null) {
            return null;
        }
        Instant since = now.minus(Duration.ofDays(90));
        List<Point> points = switch (row.type()) {
            case LIFT_WEIGHT -> goals.exerciseHistory(userId, row.exercise(), false, since);
            case EXERCISE_REPS -> goals.exerciseHistory(userId, row.exercise(), true, since);
            case BODY_WEIGHT -> goals.bodyWeightHistory(userId, since);
            case WEEKLY_WORKOUTS -> List.of();
        };
        if (points.size() < 3
                || Duration.between(points.getFirst().at(), points.getLast().at()).toDays() < 7) {
            return null;
        }
        double n = points.size(), sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (Point p : points) {
            double x = p.at().getEpochSecond() / 86_400.0;
            sx += x;
            sy += p.value();
            sxx += x * x;
            sxy += x * p.value();
        }
        double denominator = n * sxx - sx * sx;
        if (Math.abs(denominator) < 1e-9) {
            return null;
        }
        double perDay = (n * sxy - sx * sy) / denominator;
        double remaining = row.target() - current;
        if (perDay == 0 || Math.signum(perDay) != Math.signum(remaining)) {
            return null;
        }
        double days = remaining / perDay;
        if (days > 3 * 365) {
            return null;
        }
        return LocalDate.ofInstant(now, zone).plusDays((long) Math.ceil(days));
    }

    private static String describe(Goal goal) {
        String what = switch (goal.type()) {
            case LIFT_WEIGHT -> goal.exercise() + " heaviest set: " + kg(goal.current()) + " now, target " + kg(goal.target());
            case EXERCISE_REPS -> goal.exercise() + " reps in one set: " + num(goal.current()) + " now, target " + num(goal.target());
            case BODY_WEIGHT -> "Body weight: " + kg(goal.current()) + " now (started " + kg(goal.startValue()) + "), target " + kg(goal.target());
            case WEEKLY_WORKOUTS -> "Train " + num(goal.target()) + "x a week: " + num(goal.current()) + " so far this week, "
                    + goal.streakWeeks() + "-week streak";
        };
        String deadline = goal.deadline() == null ? "" : ", deadline " + goal.deadline();
        return "- " + what + deadline + " (" + goal.status().value().replace('_', ' ') + ")";
    }

    private static String kg(Double value) {
        return value == null ? "none yet" : num(value) + " kg";
    }

    private static String num(Double value) {
        return value == null ? "none" : String.format(Locale.ROOT, "%.1f", value).replaceAll("\\.0$", "");
    }
}
