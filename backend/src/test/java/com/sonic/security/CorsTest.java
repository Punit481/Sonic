package com.sonic.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sonic.IntegrationTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Browsers ask before cross-origin requests (a CORS preflight). MockMvc API tests skip that step,
 * so a method missing from the CORS config only shows up in a real browser. Every method the
 * frontend uses must pass here.
 */
class CorsTest extends IntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {"GET", "POST", "PUT", "PATCH", "DELETE"})
    void theFrontendMayUseEveryMethodTheApiNeeds(String method) throws Exception {
        mvc.perform(options("/api/v1/me")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", method)
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PATCH"})
    void otherSitesAreRefused(String method) throws Exception {
        mvc.perform(options("/api/v1/me")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", method))
                .andExpect(status().isForbidden());
    }
}
