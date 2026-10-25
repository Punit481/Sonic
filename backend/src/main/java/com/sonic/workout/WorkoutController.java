package com.sonic.workout;

import com.sonic.common.PageRequest;
import com.sonic.common.PageResponse;
import com.sonic.security.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
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
@RequestMapping("/api/v1/workouts")
class WorkoutController {

    private final WorkoutService workouts;

    WorkoutController(WorkoutService workouts) {
        this.workouts = workouts;
    }

    @PostMapping
    ResponseEntity<WorkoutSession> create(
            @AuthenticationPrincipal CurrentUser user, @Valid @RequestBody NewWorkout workout) {
        WorkoutSession created = workouts.create(user.id(), workout, false);
        return ResponseEntity.created(URI.create("/api/v1/workouts/" + created.id())).body(created);
    }

    @GetMapping
    PageResponse<WorkoutSession> list(
            @AuthenticationPrincipal CurrentUser user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return workouts.list(user.id(), new PageRequest(page, size));
    }

    @GetMapping("/{id}")
    ResponseEntity<WorkoutSession> get(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID id) {
        return ResponseEntity.of(workouts.find(user.id(), id));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID id) {
        return workouts.delete(user.id(), id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
