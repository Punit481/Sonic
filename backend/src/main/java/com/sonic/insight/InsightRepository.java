package com.sonic.insight;

import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.Timestamps;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
class InsightRepository {

    record StoredInsight(Insight insight, Instant canRegenerateAfter) {}

    private final JdbcClient jdbc;
    private final JsonMapper json;

    InsightRepository(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    Optional<StoredInsight> findLatest(UUID userId) {
        return jdbc.sql("""
                select content, generated_at, can_regenerate_after from user_insight
                where user_id = :userId
                order by generated_at desc
                limit 1
                """)
                .param("userId", userId)
                .query((rs, n) -> new StoredInsight(
                        json.readValue(rs.getString("content"), Insight.Content.class)
                                .generatedAt(Timestamps.read(rs, "generated_at")),
                        Timestamps.read(rs, "can_regenerate_after")))
                .optional();
    }

    void insert(UUID userId, Insight.Content content, Instant generatedAt, Instant canRegenerateAfter) {
        jdbc.sql("""
                insert into user_insight (id, user_id, content, generated_at, can_regenerate_after)
                values (:id, :userId, cast(:content as jsonb), :generatedAt, :canRegenerateAfter)
                """)
                .param("id", UUID.randomUUID())
                .param("userId", userId)
                .param("content", json.writeValueAsString(content))
                .param("generatedAt", toDb(generatedAt))
                .param("canRegenerateAfter", toDb(canRegenerateAfter))
                .update();
    }
}
