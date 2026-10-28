package com.sonic.user;

import com.sonic.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final UserRepository users;

    MeController(UserRepository users) {
        this.users = users;
    }

    record MeResponse(UUID id, String email, String name, boolean isPremium, String weightUnit) {}

    record Preferences(@NotNull @Pattern(regexp = "kg|lb", message = "must be kg or lb") String weightUnit) {}

    @GetMapping
    MeResponse me(@AuthenticationPrincipal CurrentUser currentUser) {
        User user = users.findById(currentUser.id()).orElseThrow();
        return new MeResponse(user.id(), user.email(), user.name(), user.premium(), user.weightUnit());
    }

    @PatchMapping
    MeResponse update(@AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody Preferences preferences) {
        users.updateWeightUnit(currentUser.id(), preferences.weightUnit());
        return me(currentUser);
    }
}
