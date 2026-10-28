package com.sonic.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<User> findByClerkId(String clerkId) {
        return jdbc.sql("select * from app_user where clerk_id = :clerkId")
                .param("clerkId", clerkId)
                .query(UserRepository::mapRow)
                .optional();
    }

    public Optional<User> findById(UUID id) {
        return jdbc.sql("select * from app_user where id = :id")
                .param("id", id)
                .query(UserRepository::mapRow)
                .optional();
    }

    /** Creates the user, or returns the existing row if a concurrent request created it first. */
    public User insertIfAbsent(String clerkId, String email, String name) {
        jdbc.sql("""
                insert into app_user (clerk_id, email, name)
                values (:clerkId, :email, :name)
                on conflict (clerk_id) do nothing
                """)
                .param("clerkId", clerkId)
                .param("email", email)
                .param("name", name)
                .update();
        return findByClerkId(clerkId).orElseThrow();
    }

    public void updateWeightUnit(UUID id, String weightUnit) {
        jdbc.sql("update app_user set weight_unit = :unit where id = :id")
                .param("unit", weightUnit)
                .param("id", id)
                .update();
    }

    private static User mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new User(
                rs.getObject("id", UUID.class),
                rs.getString("clerk_id"),
                rs.getString("email"),
                rs.getString("name"),
                rs.getBoolean("is_premium"),
                rs.getString("weight_unit"),
                rs.getTimestamp("created_at").toInstant());
    }
}
