package com.sonic.common;

import com.sonic.config.SonicProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Caps paid AI calls per user. Buckets live in memory, so the limit is per server instance;
 * move to bucket4j's Postgres or Redis backend if the API is ever scaled out.
 */
@Component
public class AiRateLimiter {

    private final Map<UUID, Bucket> buckets = new ConcurrentHashMap<>();
    private final int requestsPerHour;

    public AiRateLimiter(SonicProperties properties) {
        this.requestsPerHour = properties.rateLimit().aiRequestsPerHour();
    }

    public void consume(UUID userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, id -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(requestsPerHour)
                        .refillGreedy(requestsPerHour, Duration.ofHours(1))
                        .build())
                .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long seconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds());
            throw ApiException.rateLimited(seconds);
        }
    }
}
