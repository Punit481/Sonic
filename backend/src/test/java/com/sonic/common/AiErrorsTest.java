package com.sonic.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.openai.core.http.Headers;
import com.openai.errors.BadRequestException;
import com.openai.errors.RateLimitException;
import com.openai.errors.UnauthorizedException;
import org.junit.jupiter.api.Test;

class AiErrorsTest {

    private static String type(ApiException ex) {
        return ex.getBody().getType().toString();
    }

    @Test
    void rateLimitBecomesTheUsageLimitProblem() {
        var cause = RateLimitException.builder().headers(Headers.builder().build()).build();
        var ex = AiErrors.translate("test", new RuntimeException("wrapped", cause), "detail");
        assertThat(type(ex)).endsWith("/ai-quota-exhausted");
    }

    @Test
    void rejectedKeyBecomesNotConfigured() {
        var cause = UnauthorizedException.builder().headers(Headers.builder().build()).build();
        var ex = AiErrors.translate("test", new RuntimeException("wrapped", cause), "detail");
        assertThat(type(ex)).endsWith("/ai-not-configured");
    }

    @Test
    void otherFailuresBecomeAiUnavailable() {
        var cause = BadRequestException.builder().headers(Headers.builder().build()).build();
        var ex = AiErrors.translate("test", new RuntimeException("wrapped", cause), "Could not do it.");
        assertThat(type(ex)).endsWith("/ai-unavailable");
        assertThat(ex.getBody().getDetail()).isEqualTo("Could not do it.");
    }

    @Test
    void ownProblemsPassThrough() {
        var original = ApiException.notUnderstood("nope");
        assertThat(AiErrors.translate("test", original, "detail")).isSameAs(original);
    }
}
