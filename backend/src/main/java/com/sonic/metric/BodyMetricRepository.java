package com.sonic.metric;

import static com.sonic.common.Timestamps.readDouble;
import static com.sonic.common.Timestamps.toDb;

import com.sonic.common.PageRequest;
import com.sonic.common.Timestamps;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class BodyMetricRepository {

    private static final RowMapper<BodyMetric> MAPPER = (rs, n) -> new BodyMetric(
            rs.getObject("id", UUID.class),
            Timestamps.read(rs, "measured_at"),
            readDouble(rs, "weight_kg"),
            readDouble(rs, "body_fat_pct"),
            readDouble(rs, "muscle_mass_kg"));

    private final JdbcClient jdbc;

    BodyMetricRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    BodyMetric insert(UUID userId, NewBodyMetric metric, Instant measuredAt) {
        return jdbc.sql("""
                insert into body_metric (id, user_id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg)
                values (:id, :userId, :measuredAt, :weight, :bodyFat, :muscleMass)
                returning *
                """)
                .param("id", UUID.randomUUID())
                .param("userId", userId)
                .param("measuredAt", toDb(measuredAt))
                .param("weight", metric.weight())
                .param("bodyFat", metric.bodyFat())
                .param("muscleMass", metric.muscleMass())
                .query(MAPPER)
                .single();
    }

    List<BodyMetric> findPage(UUID userId, PageRequest page) {
        return jdbc.sql("""
                select * from body_metric
                where user_id = :userId
                order by measured_at desc
                limit :limit offset :offset
                """)
                .param("userId", userId)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query(MAPPER)
                .list();
    }

    long countByUser(UUID userId) {
        return jdbc.sql("select count(*) from body_metric where user_id = :userId")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    boolean delete(UUID userId, UUID id) {
        return jdbc.sql("delete from body_metric where id = :id and user_id = :userId")
                .param("id", id)
                .param("userId", userId)
                .update() > 0;
    }
}
