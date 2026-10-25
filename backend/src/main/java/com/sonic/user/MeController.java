package com.sonic.user;

import com.sonic.security.CurrentUser;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final UserRepository users;

    MeController(UserRepository users) {
        this.users = users;
    }

    record MeResponse(UUID id, String email, String name, boolean isPremium) {}

    @GetMapping
    MeResponse me(@AuthenticationPrincipal CurrentUser currentUser) {
        User user = users.findById(currentUser.id()).orElseThrow();
        return new MeResponse(user.id(), user.email(), user.name(), user.premium());
    }
}
