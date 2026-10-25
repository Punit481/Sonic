package com.sonic.workout;

import com.sonic.common.PageRequest;
import com.sonic.common.PageResponse;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkoutService {

    private final WorkoutRepository workouts;
    private final Clock clock;

    WorkoutService(WorkoutRepository workouts, Clock clock) {
        this.workouts = workouts;
        this.clock = clock;
    }

    @Transactional
    public WorkoutSession create(UUID userId, NewWorkout workout, boolean aiTagged) {
        UUID id = workouts.insert(userId, workout, aiTagged, clock.instant());
        return workouts.findById(userId, id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkoutSession> list(UUID userId, PageRequest page) {
        return PageResponse.of(workouts.findPage(userId, page), page, workouts.countByUser(userId));
    }

    @Transactional(readOnly = true)
    public Optional<WorkoutSession> find(UUID userId, UUID sessionId) {
        return workouts.findById(userId, sessionId);
    }

    @Transactional
    public boolean delete(UUID userId, UUID sessionId) {
        return workouts.delete(userId, sessionId);
    }
}
