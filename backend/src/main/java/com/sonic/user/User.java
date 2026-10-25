package com.sonic.user;

import java.time.Instant;
import java.util.UUID;

public record User(UUID id, String clerkId, String email, String name, boolean premium, Instant createdAt) {}
