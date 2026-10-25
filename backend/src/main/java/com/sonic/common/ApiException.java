package com.sonic.common;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Errors the API reports on purpose. Each one becomes an RFC 7807 problem response
 * with a stable {@code type} the frontend can switch on.
 */
public class ApiException extends ErrorResponseException {

    private ApiException(HttpStatus status, String type, String title, String detail, Map<String, Object> properties) {
        super(status, problem(status, type, title, detail, properties), null);
    }

    private static ProblemDetail problem(
            HttpStatus status, String type, String title, String detail, Map<String, Object> properties) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("https://sonic.app/problems/" + type));
        problem.setTitle(title);
        properties.forEach(problem::setProperty);
        return problem;
    }

    public static ApiException notEnoughData(String detail) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "not-enough-data", "Not enough data", detail, Map.of());
    }

    public static ApiException notUnderstood(String detail) {
        return new ApiException(
                HttpStatus.UNPROCESSABLE_CONTENT,
                "input-not-understood",
                "Could not understand the input",
                detail,
                Map.of("suggestion",
                        "Try something like: 'Bench press, 3 sets of 8 at 185 pounds' or 'I weigh 80 kg today'"));
    }

    public static ApiException cooldown(Instant retryAt, Instant now) {
        ApiException ex = new ApiException(
                HttpStatus.TOO_MANY_REQUESTS,
                "insights-cooldown",
                "Insights were generated recently",
                "New insights can be generated after " + retryAt,
                Map.of("canRegenerateAt", retryAt));
        ex.getHeaders().set("Retry-After", String.valueOf(Math.max(1, Duration.between(now, retryAt).toSeconds())));
        return ex;
    }

    public static ApiException rateLimited(long retryAfterSeconds) {
        ApiException ex = new ApiException(
                HttpStatus.TOO_MANY_REQUESTS,
                "rate-limited",
                "Too many requests",
                "AI request limit reached. Try again in " + retryAfterSeconds + " seconds.",
                Map.of("retryAfterSeconds", retryAfterSeconds));
        ex.getHeaders().set("Retry-After", String.valueOf(retryAfterSeconds));
        return ex;
    }

    public static ApiException aiUnavailable(String detail) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "ai-unavailable", "The AI service failed", detail, Map.of());
    }

    public static ApiException badRequest(String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, "bad-request", "Bad request", detail, Map.of());
    }
}
