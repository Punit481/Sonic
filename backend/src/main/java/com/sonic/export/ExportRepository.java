package com.sonic.export;

import com.sonic.common.Timestamps;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class ExportRepository {

    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final double KG_PER_LB = 0.45359237;

    private final JdbcClient jdbc;

    ExportRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    String workoutsCsv(UUID userId, ZoneId zone, String unit) {
        Csv csv = new Csv("date", "exercise", "category", "set", "reps", "weight_" + unit, "distance_km",
                "duration_min", "intensity", "set_note", "workout_note");
        jdbc.sql("""
                select w.performed_at, e.name, e.category, s.position, s.reps, s.weight_kg, s.distance_km,
                       s.duration_hours, s.intensity, s.note as set_note, w.note as workout_note
                from workout_session w
                join exercise e on e.session_id = w.id
                join exercise_set s on s.exercise_id = e.id
                where w.user_id = :userId
                order by w.performed_at, w.id, e.position, s.position
                """)
                .param("userId", userId)
                .query(rs -> {
                    csv.row(
                            Timestamps.read(rs, "performed_at").atZone(zone).format(LOCAL),
                            rs.getString("name"),
                            rs.getString("category"),
                            rs.getInt("position") + 1,
                            rs.getObject("reps", Integer.class),
                            weight(Timestamps.readDouble(rs, "weight_kg"), unit),
                            number(Timestamps.readDouble(rs, "distance_km"), 3),
                            minutes(Timestamps.readDouble(rs, "duration_hours")),
                            rs.getString("intensity"),
                            rs.getString("set_note"),
                            rs.getString("workout_note"));
                });
        return csv.toString();
    }

    String bodyMetricsCsv(UUID userId, ZoneId zone, String unit) {
        Csv csv = new Csv("date", "weight_" + unit, "body_fat_pct", "muscle_mass_" + unit);
        jdbc.sql("select * from body_metric where user_id = :userId order by measured_at")
                .param("userId", userId)
                .query(rs -> {
                    csv.row(
                            Timestamps.read(rs, "measured_at").atZone(zone).format(LOCAL),
                            weight(Timestamps.readDouble(rs, "weight_kg"), unit),
                            number(Timestamps.readDouble(rs, "body_fat_pct"), 1),
                            weight(Timestamps.readDouble(rs, "muscle_mass_kg"), unit));
                });
        return csv.toString();
    }

    private static String weight(Double kg, String unit) {
        return kg == null ? null : number("lb".equals(unit) ? kg / KG_PER_LB : kg, 2);
    }

    private static String minutes(Double hours) {
        return hours == null ? null : number(hours * 60, 1);
    }

    /** Plain decimal, no trailing zeros: 82.5, not 82.50 or 8.25E1. */
    private static String number(Double value, int scale) {
        return value == null ? null
                : BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }
}
