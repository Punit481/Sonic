package com.sonic.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sonic.config.SonicProperties;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Fallback lookup of a user's email and name through Clerk's Backend API. Only used when the
 * session token doesn't carry them, which the README's session-token setup avoids.
 */
@Component
class ClerkUserClient {

    private static final Logger log = LoggerFactory.getLogger(ClerkUserClient.class);

    private final RestClient client;
    private final boolean enabled;

    ClerkUserClient(SonicProperties properties) {
        String secretKey = properties.clerk().secretKey();
        this.enabled = StringUtils.hasText(secretKey);
        this.client = RestClient.builder().baseUrl("https://api.clerk.com/v1")
                .defaultHeader("Authorization", "Bearer " + secretKey)
                .build();
    }

    record Profile(String email, String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ClerkUser(
            @JsonProperty("first_name") String firstName,
            @JsonProperty("primary_email_address_id") String primaryEmailAddressId,
            @JsonProperty("email_addresses") List<EmailAddress> emailAddresses) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EmailAddress(String id, @JsonProperty("email_address") String emailAddress) {}

    Optional<Profile> fetch(String clerkId) {
        if (!enabled) {
            return Optional.empty();
        }
        try {
            ClerkUser user = client.get().uri("/users/{id}", clerkId).retrieve().body(ClerkUser.class);
            if (user == null) {
                return Optional.empty();
            }
            String email = user.emailAddresses() == null ? null : user.emailAddresses().stream()
                    .filter(address -> address.id().equals(user.primaryEmailAddressId()))
                    .map(EmailAddress::emailAddress)
                    .findFirst()
                    .orElse(null);
            return Optional.of(new Profile(email, user.firstName()));
        } catch (RestClientException ex) {
            log.warn("Could not fetch Clerk user {}", clerkId, ex);
            return Optional.empty();
        }
    }
}
