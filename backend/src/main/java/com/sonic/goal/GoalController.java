package com.sonic.goal;

import com.sonic.common.ApiException;
import com.sonic.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goals")
class GoalController {

    private final GoalService goals;

    GoalController(GoalService goals) {
        this.goals = goals;
    }

    /** {@code target} is in kg for weight goals. {@code timeZone} decides where weeks start. */
    record CreateGoal(@NotNull GoalType type, String exercise, @NotNull @Positive Double target,
            LocalDate deadline, String timeZone) {}

    @GetMapping
    List<Goal> list(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) String timeZone) {
        return goals.list(user.id(), zone(timeZone));
    }

    @PostMapping
    ResponseEntity<Goal> create(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody CreateGoal request) {
        return ResponseEntity.status(201).body(goals.create(user.id(),
                new GoalService.NewGoal(request.type(), request.exercise(), request.target(), request.deadline()),
                zone(request.timeZone())));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID id) {
        return goals.delete(user.id(), id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    static ZoneId zone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timeZone);
        } catch (DateTimeException ex) {
            throw ApiException.badRequest("Unknown time zone: " + timeZone);
        }
    }
}
