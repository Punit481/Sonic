package com.sonic;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.sonic.insight.InsightGenerator;
import com.sonic.voice.VoiceParser;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Boots the whole app against a real Postgres. Only the edges are stubbed: the JWT decoder
 * (so tests don't need Clerk) and the two AI interfaces (so tests don't call the AI provider).
 * A request sent {@link #as} a user carries the bearer token {@code test.<clerkId>}, which
 * still goes through the real security chain and user provisioning.
 */
@SpringBootTest(properties = {
    "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://clerk.test",
    "spring.ai.openai.api-key=test-key",
    "spring.docker.compose.enabled=false",
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcClient jdbc;

    @MockitoBean
    protected JwtDecoder jwtDecoder;

    @MockitoBean
    protected VoiceParser voiceParser;

    @MockitoBean
    protected InsightGenerator insightGenerator;

    @BeforeEach
    void stubTokens() {
        given(jwtDecoder.decode(anyString())).willAnswer(call -> {
            String token = call.getArgument(0);
            if (!token.startsWith("test.")) {
                throw new BadJwtException("bad token");
            }
            String clerkId = token.substring("test.".length());
            return Jwt.withTokenValue(token)
                    .header("alg", "RS256")
                    .subject(clerkId)
                    .claims(claims -> claims.putAll(Map.of("email", clerkId + "@example.com", "name", "Test")))
                    .issuedAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(60))
                    .build();
        });
    }

    /** A fresh Clerk user id, so tests never see each other's data. */
    protected static String newClerkId() {
        return "user_" + UUID.randomUUID();
    }

    protected static RequestPostProcessor as(String clerkId) {
        return request -> {
            request.addHeader("Authorization", "Bearer test." + clerkId);
            return request;
        };
    }

    protected void makePremium(String clerkId) {
        jdbc.sql("update app_user set is_premium = true where clerk_id = :id").param("id", clerkId).update();
    }
}
