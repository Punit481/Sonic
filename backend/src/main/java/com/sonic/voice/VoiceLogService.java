package com.sonic.voice;

import com.sonic.common.AiRateLimiter;
import com.sonic.common.ApiException;
import com.sonic.metric.BodyMetric;
import com.sonic.metric.BodyMetricService;
import com.sonic.metric.NewBodyMetric;
import com.sonic.user.UserRepository;
import com.sonic.workout.NewWorkout;
import com.sonic.workout.PersonalRecord;
import com.sonic.workout.WorkoutService;
import com.sonic.workout.WorkoutSession;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Voice logging in two steps: {@code parse} asks the AI what was said and returns it unsaved, so
 * the user can check and fix it; {@code confirm} saves what they approved. {@code log*} does both
 * at once, for API clients that don't need the review step.
 */
@Service
public class VoiceLogService {

    private final VoiceParser parser;
    private final WorkoutService workouts;
    private final BodyMetricService metrics;
    private final UserRepository users;
    private final AiRateLimiter rateLimiter;
    private final Validator validator;
    private final TransactionTemplate transaction;
    private final Clock clock;

    VoiceLogService(
            VoiceParser parser,
            WorkoutService workouts,
            BodyMetricService metrics,
            UserRepository users,
            AiRateLimiter rateLimiter,
            Validator validator,
            TransactionTemplate transaction,
            Clock clock) {
        this.parser = parser;
        this.workouts = workouts;
        this.metrics = metrics;
        this.users = users;
        this.rateLimiter = rateLimiter;
        this.validator = validator;
        this.transaction = transaction;
        this.clock = clock;
    }

    /** What the AI understood, not yet saved. Either part may be null, but not both. */
    public record VoiceDraft(String transcript, @Valid NewWorkout workout, @Valid NewBodyMetric metric) {}

    /** {@code transcript} is what the user said; for audio input it is the speech-to-text result. */
    public record VoiceLogResult(
            String transcript, WorkoutSession workout, BodyMetric metric, List<PersonalRecord> records) {}

    public VoiceDraft parseText(UUID userId, String transcript, ZoneId zone) {
        return parse(userId, zone, () -> transcript);
    }

    public VoiceDraft parseAudio(UUID userId, Resource audio, ZoneId zone) {
        return parse(userId, zone, () -> {
            String transcript = parser.transcribe(audio);
            if (transcript == null || transcript.isBlank()) {
                throw ApiException.notUnderstood("No speech was heard in the recording.");
            }
            return transcript.strip();
        });
    }

    public VoiceLogResult confirm(UUID userId, VoiceDraft draft) {
        if (draft.workout() == null && draft.metric() == null) {
            throw ApiException.badRequest("Nothing to save: add a workout or a body measurement.");
        }
        return transaction.execute(status -> {
            WorkoutService.Saved saved = draft.workout() == null ? null : workouts.create(userId, draft.workout(), true);
            BodyMetric metric = draft.metric() == null ? null : metrics.create(userId, draft.metric());
            return new VoiceLogResult(
                    draft.transcript(),
                    saved == null ? null : saved.workout(),
                    metric,
                    saved == null ? List.of() : saved.records());
        });
    }

    public VoiceLogResult logText(UUID userId, String transcript, ZoneId zone) {
        return confirm(userId, parseText(userId, transcript, zone));
    }

    public VoiceLogResult logAudio(UUID userId, Resource audio, ZoneId zone) {
        return confirm(userId, parseAudio(userId, audio, zone));
    }

    private VoiceDraft parse(UUID userId, ZoneId zone, Supplier<String> transcriptSource) {
        rateLimiter.consume(userId);
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, zone);
        String weightUnit = users.findById(userId).map(u -> u.weightUnit()).orElse("kg");
        var context = new VoiceParser.Context(today, weightUnit, workouts.knownExerciseNames(userId));

        // The AI calls happen outside any transaction so no database connection is held while waiting.
        String transcript = transcriptSource.get();
        ParsedVoiceLog parsed = parser.parseText(transcript, context);
        NewWorkout workout = toWorkout(parsed.workout(), today, zone, now);
        NewBodyMetric metric = toMetric(parsed.bodyMetrics(), today, zone, now);
        if (workout == null && metric == null) {
            throw ApiException.notUnderstood("No workout or body measurement was found in what you said.");
        }
        return new VoiceDraft(transcript, workout, metric);
    }

    private NewWorkout toWorkout(ParsedVoiceLog.Workout parsed, LocalDate today, ZoneId zone, Instant now) {
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
                                .flatMap(set -> Collections.nCopies(repeat(set.count()), new NewWorkout.NewSet(
                                        set.reps(), set.weight(), set.distance(), set.duration(),
                                        set.intensity(), set.note())).stream())
                                .toList()))
                .toList();
        if (exercises.isEmpty()) {
            return null;
        }
        return validated(new NewWorkout(
                dateFor(parsed.date(), today, zone, now), parsed.durationHours(), parsed.note(), exercises));
    }

    private NewBodyMetric toMetric(ParsedVoiceLog.BodyMetrics parsed, LocalDate today, ZoneId zone, Instant now) {
        if (parsed == null || (parsed.weight() == null && parsed.bodyFat() == null && parsed.muscleMass() == null)) {
            return null;
        }
        return validated(new NewBodyMetric(
                dateFor(parsed.date(), today, zone, now), parsed.weight(), parsed.bodyFat(), parsed.muscleMass()));
    }

    /** Sets the model wrote once with a count ("5 sets of 5"), capped so a misheard number can't explode. */
    private static int repeat(Integer count) {
        return count == null || count < 1 ? 1 : Math.min(count, 20);
    }

    /** A past day ("yesterday") is stored at midday that day, in the user's time zone; otherwise now. */
    private static Instant dateFor(LocalDate said, LocalDate today, ZoneId zone, Instant now) {
        return said == null || !said.isBefore(today) ? now : said.atTime(12, 0).atZone(zone).toInstant();
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
