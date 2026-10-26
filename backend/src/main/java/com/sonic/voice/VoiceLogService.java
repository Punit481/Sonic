package com.sonic.voice;

import com.sonic.common.AiRateLimiter;
import com.sonic.common.ApiException;
import com.sonic.metric.BodyMetric;
import com.sonic.metric.BodyMetricService;
import com.sonic.metric.NewBodyMetric;
import com.sonic.workout.NewWorkout;
import com.sonic.workout.WorkoutService;
import com.sonic.workout.WorkoutSession;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class VoiceLogService {

    private final VoiceParser parser;
    private final WorkoutService workouts;
    private final BodyMetricService metrics;
    private final AiRateLimiter rateLimiter;
    private final Validator validator;
    private final TransactionTemplate transaction;
    private final Clock clock;

    VoiceLogService(
            VoiceParser parser,
            WorkoutService workouts,
            BodyMetricService metrics,
            AiRateLimiter rateLimiter,
            Validator validator,
            TransactionTemplate transaction,
            Clock clock) {
        this.parser = parser;
        this.workouts = workouts;
        this.metrics = metrics;
        this.rateLimiter = rateLimiter;
        this.validator = validator;
        this.transaction = transaction;
        this.clock = clock;
    }

    /** {@code transcript} is what the user said; for audio input it is the speech-to-text result. */
    public record VoiceLogResult(String transcript, WorkoutSession workout, BodyMetric metric) {}

    public VoiceLogResult logText(UUID userId, String transcript, ZoneId zone) {
        return log(userId, zone, () -> transcript);
    }

    public VoiceLogResult logAudio(UUID userId, Resource audio, ZoneId zone) {
        return log(userId, zone, () -> {
            String transcript = parser.transcribe(audio);
            if (transcript == null || transcript.isBlank()) {
                throw ApiException.notUnderstood("No speech was heard in the recording.");
            }
            return transcript.strip();
        });
    }

    private VoiceLogResult log(UUID userId, ZoneId zone, Supplier<String> transcriptSource) {
        rateLimiter.consume(userId);
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, zone);

        // The AI calls happen outside the transaction so no database connection is held while waiting.
        String transcript = transcriptSource.get();
        ParsedVoiceLog parsed = parser.parseText(transcript, today);
        NewWorkout workout = toWorkout(parsed.workout());
        NewBodyMetric metric = toMetric(parsed.bodyMetrics(), today, zone, now);
        if (workout == null && metric == null) {
            throw ApiException.notUnderstood("No workout or body measurement was found in what you said.");
        }

        return transaction.execute(status -> new VoiceLogResult(
                transcript,
                workout == null ? null : workouts.create(userId, workout, true),
                metric == null ? null : metrics.create(userId, metric)));
    }

    private NewWorkout toWorkout(ParsedVoiceLog.Workout parsed) {
        if (parsed == null || parsed.exercises() == null || parsed.exercises().isEmpty()) {
            return null;
        }
        List<NewWorkout.NewExercise> exercises = parsed.exercises().stream()
                .filter(exercise -> exercise.sets() != null && !exercise.sets().isEmpty())
                .map(exercise -> new NewWorkout.NewExercise(
                        exercise.name(),
                        exercise.category(),
                        exercise.isCustom(),
                        exercise.sets().stream()
                                .map(set -> new NewWorkout.NewSet(
                                        set.reps(), set.weight(), set.distance(), set.duration(),
                                        set.intensity(), set.note()))
                                .toList()))
                .toList();
        if (exercises.isEmpty()) {
            return null;
        }
        return validated(new NewWorkout(null, parsed.durationHours(), parsed.note(), exercises));
    }

    private NewBodyMetric toMetric(ParsedVoiceLog.BodyMetrics parsed, LocalDate today, ZoneId zone, Instant now) {
        if (parsed == null || (parsed.weight() == null && parsed.bodyFat() == null && parsed.muscleMass() == null)) {
            return null;
        }
        // A past date ("yesterday") is stored at midday that day, in the user's time zone.
        Instant measuredAt = parsed.date() == null || !parsed.date().isBefore(today)
                ? now
                : parsed.date().atTime(12, 0).atZone(zone).toInstant();
        return validated(new NewBodyMetric(measuredAt, parsed.weight(), parsed.bodyFat(), parsed.muscleMass()));
    }

    /** The model's output is untrusted input, so it gets the same validation as a request body. */
    private <T> T validated(T value) {
        Set<ConstraintViolation<T>> violations = validator.validate(value);
        if (!violations.isEmpty()) {
            String detail = violations.stream()
                    .map(v -> v.getPropertyPath() + " " + v.getMessage())
                    .sorted()
                    .collect(Collectors.joining("; "));
            throw ApiException.notUnderstood("Some values didn't make sense: " + detail);
        }
        return value;
    }
}
