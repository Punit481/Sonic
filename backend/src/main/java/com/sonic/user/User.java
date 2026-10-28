package com.sonic.user;

import java.time.Instant;
import java.util.UUID;

/** {@code weightUnit} is "kg" or "lb": how the user thinks about weight. Storage is always kg. */
public record User(
        UUID id, String clerkId, String email, String name, boolean premium, String weightUnit, Instant createdAt) {}
