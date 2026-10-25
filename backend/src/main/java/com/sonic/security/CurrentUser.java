package com.sonic.security;

import java.util.UUID;

/** The signed-in user, available in controllers through {@code @AuthenticationPrincipal}. */
public record CurrentUser(UUID id, String clerkId, boolean premium) {}
