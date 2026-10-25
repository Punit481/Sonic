package com.sonic.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("sonic")
public record SonicProperties(Cors cors, Clerk clerk, Insights insights, RateLimit rateLimit) {

    public record Cors(List<String> allowedOrigins) {}

    /** {@code secretKey} is optional: it is only used to look up users whose token has no email claim. */
    public record Clerk(String secretKey) {}

    public record Insights(Duration cooldown, int minSessions, Duration lookback) {}

    public record RateLimit(int aiRequestsPerHour) {}
}
