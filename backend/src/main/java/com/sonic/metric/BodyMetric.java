package com.sonic.metric;

import java.time.Instant;
import java.util.UUID;

/** Weight and muscle mass in kg, body fat as a percentage. */
public record BodyMetric(UUID id, Instant date, Double weight, Double bodyFat, Double muscleMass) {}
