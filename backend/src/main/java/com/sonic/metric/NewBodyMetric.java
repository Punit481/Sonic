package com.sonic.metric;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;

/** A measurement to save. {@code date} defaults to now; at least one value is required. */
public record NewBodyMetric(
        Instant date,
        @Positive Double weight,
        @PositiveOrZero @DecimalMax("100") Double bodyFat,
        @Positive Double muscleMass) {

    @AssertTrue(message = "At least one of weight, bodyFat or muscleMass is required")
    public boolean isAnyValuePresent() {
        return weight != null || bodyFat != null || muscleMass != null;
    }
}
