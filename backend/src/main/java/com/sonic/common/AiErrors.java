package com.sonic.common;

import com.openai.errors.OpenAIServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Turns a failed AI call into the problem response the user sees. The OpenAI client already
 * retried temporary failures, so whatever reaches here is final.
 */
public final class AiErrors {

    private static final Logger log = LoggerFactory.getLogger(AiErrors.class);

    private AiErrors() {}

    public static ApiException translate(String what, RuntimeException ex, String detail) {
        if (ex instanceof ApiException api) {
            return api;
        }
        Integer status = providerStatus(ex);
        if (status != null && status == 429) {
            log.warn("{} refused: AI provider rate limit reached", what);
            return ApiException.aiQuotaExhausted();
        }
        if (status != null && (status == 401 || status == 403)) {
            log.error("{} refused: the AI provider rejected the API key (status {})", what, status);
            return ApiException.aiNotConfigured();
        }
        log.warn("{} failed (provider status {})", what, status, ex);
        return ApiException.aiUnavailable(detail);
    }

    /** The HTTP status the AI provider returned, if the failure came from its response. */
    static Integer providerStatus(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof OpenAIServiceException service) {
                return service.statusCode();
            }
        }
        return null;
    }
}
