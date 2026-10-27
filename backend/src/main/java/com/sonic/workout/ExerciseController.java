package com.sonic.workout;

import com.sonic.security.CurrentUser;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exercises")
class ExerciseController {

    private final WorkoutService workouts;

    ExerciseController(WorkoutService workouts) {
        this.workouts = workouts;
    }

    /** Every exercise the user has logged, with all-time bests, most frequent first. */
    @GetMapping
    List<ExerciseStats> list(@AuthenticationPrincipal CurrentUser user) {
        return workouts.exerciseStats(user.id());
    }
}
