package com.sonic.security;

import com.sonic.user.User;
import com.sonic.user.UserRepository;
import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Turns a verified Clerk token into our own user. The first request from a new Clerk user
 * creates their row, using the {@code email} and {@code name} session-token claims when present.
 */
@Component
class ClerkAuthenticationConverter implements Converter<Jwt, ClerkAuthentication> {

    private final UserRepository users;
    private final ClerkUserClient clerk;

    ClerkAuthenticationConverter(UserRepository users, ClerkUserClient clerk) {
        this.users = users;
        this.clerk = clerk;
    }

    @Override
    public ClerkAuthentication convert(Jwt jwt) {
        String clerkId = jwt.getSubject();
        User user = users.findByClerkId(clerkId).orElseGet(() -> provision(jwt));

        List<GrantedAuthority> authorities = user.premium()
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_PREMIUM"))
                : List.of(new SimpleGrantedAuthority("ROLE_USER"));
        return new ClerkAuthentication(new CurrentUser(user.id(), clerkId, user.premium()), jwt, authorities);
    }

    private User provision(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        if (email == null) {
            var profile = clerk.fetch(jwt.getSubject());
            if (profile.isPresent()) {
                email = profile.get().email();
                name = profile.get().name();
            }
        }
        return users.insertIfAbsent(jwt.getSubject(), email, name);
    }
}
