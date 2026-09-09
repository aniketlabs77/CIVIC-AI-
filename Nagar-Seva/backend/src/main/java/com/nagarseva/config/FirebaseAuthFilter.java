package com.nagarseva.config;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.nagarseva.entity.User;
import com.nagarseva.entity.UserRole;
import com.nagarseva.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseAuthFilter.class);

    @Autowired
    private UserService userService;

    @Autowired
    private org.springframework.core.env.Environment env;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();

            if (!token.isEmpty()) {
                // 1. Support local demo development token (strictly restricted to dev profile)
                if (token.startsWith("demo-token:")) {
                    boolean isDev = env != null
                            && env.acceptsProfiles(org.springframework.core.env.Profiles.of("dev"))
                            && !env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"));

                    if (!isDev) {
                        log.warn("Rejected demo-token in non-dev/production profile for request: {}", request.getRequestURI());
                        SecurityContextHolder.clearContext();
                        filterChain.doFilter(request, response);
                        return;
                    }

                    try {
                        String[] parts = token.split(":", 5);
                        String roleStr = parts.length > 1 ? parts[1] : "CITIZEN";
                        String email = parts.length > 2 ? parts[2] : "citizen@nagarseva.com";
                        String uid = parts.length > 3 ? parts[3] : "demo-uid-1";
                        String department = parts.length > 4 ? parts[4] : null;

                        UserRole role = "ADMIN".equalsIgnoreCase(roleStr) ? UserRole.ADMIN : UserRole.CITIZEN;
                        User user = userService.findOrCreateByFirebaseUid(uid, email);
                        if (user.getRole() != role) {
                            user.setRole(role);
                        }
                        if (department != null && !department.isBlank()) {
                            user.setDepartment(department);
                        }

                        List<GrantedAuthority> authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(user, null, authorities);
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("Authenticated local demo user {} with role {}", user.getEmail(), user.getRole());
                    } catch (Exception e) {
                        log.warn("Error decoding demo token: {}", e.getMessage());
                    }
                } else {
                    // 2. Standard Firebase ID Token verification
                    try {
                        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                        String uid = decodedToken.getUid();
                        String email = decodedToken.getEmail();

                        User user = userService.findOrCreateByFirebaseUid(uid, email);

                        List<GrantedAuthority> authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(user, null, authorities);
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("Authenticated user {} with role {}", user.getEmail(), user.getRole());
                    } catch (Exception e) {
                        log.warn("Firebase ID token verification notice: {}", e.getMessage());
                        SecurityContextHolder.clearContext();
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
