package com.sonic.common;

import java.time.Duration;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Gemini often fails a call or two under load (503 "high demand", or an empty 404) and then
 * recovers. Spring AI's own retry doesn't see these, because the Gemini client wraps them in a
 * plain RuntimeException, so the AI adapters retry here. A user is waiting on the request, so
 * the budget stays short.
 */
public final class AiRetry {

    private static final Logger log = LoggerFactory.getLogger(AiRetry.class);
    private static final int ATTEMPTS = 3;
    private static final Duration FIRST_DELAY = Duration.ofSeconds(1);

    private AiRetry() {}

    public static <T> T call(String what, Supplier<T> call) {
        Duration delay = FIRST_DELAY;
        for (int attempt = 1; ; attempt++) {
            try {
                return call.get();
            } catch (RuntimeException ex) {
                if (attempt == ATTEMPTS) {
                    throw ex;
                }
                log.info("{} failed (attempt {} of {}), retrying in {}s: {}",
                        what, attempt, ATTEMPTS, delay.toSeconds(), ex.getMessage());
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
                delay = delay.multipliedBy(2);
            }
        }
    }
}
