package com.sonic.draft;

import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.Timestamps;
import com.sonic.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A transcript the user saved to finish logging later. One per user. The feature is small
 * enough that the controller talks to the database directly.
 */
@RestController
@RequestMapping("/api/v1/workout-draft")
class DraftController {

    private final JdbcClient jdbc;
    private final Clock clock;

    DraftController(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    record Draft(@NotNull @Size(max = 10_000) String text, Instant updatedAt) {}

    @GetMapping
    ResponseEntity<Draft> get(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.of(jdbc.sql("select text, updated_at from workout_draft where user_id = :userId")
                .param("userId", user.id())
                .query((rs, n) -> new Draft(rs.getString("text"), Timestamps.read(rs, "updated_at")))
                .optional());
    }

    @PutMapping
    Draft save(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody Draft draft) {
        Instant now = clock.instant();
        jdbc.sql("""
                insert into workout_draft (user_id, text, updated_at) values (:userId, :text, :now)
                on conflict (user_id) do update set text = excluded.text, updated_at = excluded.updated_at
                """)
                .param("userId", user.id())
                .param("text", draft.text())
                .param("now", toDb(now))
                .update();
        return new Draft(draft.text(), now);
    }

    @DeleteMapping
    ResponseEntity<Void> delete(@AuthenticationPrincipal CurrentUser user) {
        jdbc.sql("delete from workout_draft where user_id = :userId").param("userId", user.id()).update();
        return ResponseEntity.noContent().build();
    }
}
