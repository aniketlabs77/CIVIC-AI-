package com.nagarseva.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private FirebaseAuthFilter firebaseAuthFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .authorizeHttpRequests(auth -> auth
                // Allow CORS pre-flight requests
                .requestMatchers(antMatcher(HttpMethod.OPTIONS, "/**")).permitAll()
                // Public GET & AI endpoints
                .requestMatchers(antMatcher(HttpMethod.GET, "/api/dashboard/**")).permitAll()
                .requestMatchers(antMatcher("/api/safety/**")).permitAll()
                .requestMatchers(antMatcher(HttpMethod.GET, "/api/complaints")).permitAll()
                .requestMatchers(antMatcher(HttpMethod.GET, "/api/complaints/{id:[0-9]+}")).permitAll()
                .requestMatchers(antMatcher(HttpMethod.POST, "/api/complaints")).permitAll()
                .requestMatchers(antMatcher("/api/complaints/my")).permitAll()
                // Actuator & H2 console & AI assistant & Notifications
                .requestMatchers(antMatcher("/actuator/**")).permitAll()
                .requestMatchers(antMatcher("/h2-console/**")).permitAll()
                .requestMatchers(antMatcher("/api/ai/**")).permitAll()
                .requestMatchers(antMatcher(HttpMethod.GET, "/api/notifications/**")).permitAll()
                .requestMatchers(antMatcher("/demo-assets/**")).permitAll()
                .requestMatchers(antMatcher("/api/demo-assets/**")).permitAll()

                // Admin endpoints - require ROLE_ADMIN
                .requestMatchers(antMatcher("/api/admin/**")).hasRole("ADMIN")
                // Citizen complaint actions - require authentication
                .requestMatchers(antMatcher("/api/complaints/**")).authenticated()
                .requestMatchers(antMatcher("/api/auth/**")).authenticated()
                // All other endpoints
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.disable())
            )
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}