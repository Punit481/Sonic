package com.sonic.common;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** The Postgres driver binds {@code timestamptz} as {@link OffsetDateTime}, not {@link Instant}. */
public final class Timestamps {

    private Timestamps() {}

    public static OffsetDateTime toDb(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    public static Instant read(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    /** Reads a nullable numeric column, which {@link ResultSet#getDouble} would turn into 0. */
    public static Double readDouble(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, Double.class);
    }
}
