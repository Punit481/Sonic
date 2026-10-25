package com.sonic.insight;

import com.sonic.common.AiRateLimiter;
import com.sonic.common.ApiException;
import com.sonic.config.SonicProperties;
import com.sonic.insight.InsightRepository.StoredInsight;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
class InsightService {

    private static final Logger log = LoggerFactory.getLogger(InsightService.class);

    private final InsightRepository insights;
    private final TrainingSummaryRepository training;
    private final InsightGenerator generator;
    private final AiRateLimiter rateLimiter;
    private final Validator validator;
    private final SonicProperties.Insights config;
    private final Clock clock;

    InsightService(
            InsightRepository insights,
            TrainingSummaryRepository training,
            InsightGenerator generator,
            AiRateLimiter rateLimiter,
            Validator validator,
            SonicProperties properties,
            Clock clock) {
        this.insights = insights;
        this.training = training;
        this.generator = generator;
        this.rateLimiter = rateLimiter;
        this.validator = validator;
        this.config = properties.insights();
        this.clock = clock;
    }

    /**
     * The latest insight (null if none), and whether a new one can be generated yet.
     * {@code message} explains why not, when it can't.
     */
    record InsightStatus(Insight insights, boolean canRegenerate, Instant canRegenerateAt, String message) {}

    InsightStatus status(UUID userId) {
        Optional<StoredInsight> latest = insights.findLatest(userId);
        Insight insight = latest.map(StoredInsight::insight).orElse(null);

        long sessions = training.countSessions(userId);
        if (sessions < config.minSessions()) {
            return new InsightStatus(insight, false, null,
                    "Log at least %d workouts to get insights.".formatted(config.minSessions()));
        }
        Instant now = clock.instant();
        if (latest.isPresent() && now.isBefore(latest.get().canRegenerateAfter())) {
            return new InsightStatus(insight, false, latest.get().canRegenerateAfter(), null);
        }
        return new InsightStatus(insight, true, null, null);
    }

    InsightStatus generate(UUID userId) {
        InsightStatus current = status(userId);
        if (!current.canRegenerate()) {
            if (current.canRegenerateAt() != null) {
                throw ApiException.cooldown(current.canRegenerateAt(), clock.instant());
            }
            throw ApiException.notEnoughData(current.message());
        }
        rateLimiter.consume(userId);

        Instant now = clock.instant();
        TrainingSummary summary = training.summarize(userId, now, config.lookback());
        if (summary.totalSessions() == 0) {
            throw ApiException.notEnoughData(
                    "No workouts in the last %d days.".formatted(config.lookback().toDays()));
        }

        Insight.Content content = generator.generate(summary);
        var violations = validator.validate(content);
        if (!violations.isEmpty()) {
            log.warn("Gemini returned insights that failed validation: {}", violations);
            throw ApiException.aiUnavailable("The generated insights were incomplete. Please try again.");
        }

        Instant canRegenerateAt = now.plus(config.cooldown());
        insights.insert(userId, content, now, canRegenerateAt);
        return new InsightStatus(content.generatedAt(now), false, canRegenerateAt, null);
    }
}
