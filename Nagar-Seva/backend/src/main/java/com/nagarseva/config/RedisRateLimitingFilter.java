package com.nagarseva.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * Distributed rate limiting using Redis sliding window algorithm.
 * Replaces in-memory rate limiting for production multi-instance deployments.
 * Uses Lua script for atomic check-and-increment.
 */
@Component
@Order(10) // Run early in filter chain
public class RedisRateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimitingFilter.class);

    private static final String RATE_LIMIT_SCRIPT = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local clearBefore = now - window

            -- Remove expired entries
            redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

            -- Count current requests in window
            local count = redis.call('ZCARD', key)

            if count >= limit then
                -- Return retry-after seconds
                local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
                if #oldest > 0 then
                    local retryAfter = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
                    return {0, retryAfter}
                end
                return {0, math.ceil(window / 1000)}
            end

            -- Add current request
            redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
            redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)

            return {1, limit - count - 1}
            """;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Value("${app.rate-limiting.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limiting.requests-per-minute:5}")
    private int maxRequestsPerMinute;

    @Value("${app.rate-limiting.paths:/api/complaints}")
    private String[] rateLimitedPaths;

    private DefaultRedisScript<List<Long>> rateLimitScript;

    @Autowired
    public void setRedisTemplate(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.rateLimitScript = new DefaultRedisScript<>(RATE_LIMIT_SCRIPT, (Class<List<Long>>) (Class<?>) List.class);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        boolean shouldRateLimit = false;
        for (String rateLimitedPath : rateLimitedPaths) {
            if (path.startsWith(rateLimitedPath) && "POST".equalsIgnoreCase(request.getMethod())) {
                shouldRateLimit = true;
                break;
            }
        }

        if (!shouldRateLimit) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String key = "ratelimit:" + path + ":" + clientIp;

        try {
            long now = System.currentTimeMillis();
            long windowMs = 60_000; // 1 minute window

            List<Long> result = redisTemplate.execute(
                    rateLimitScript,
                    Collections.singletonList(key),
                    maxRequestsPerMinute, windowMs, now
            );

            if (result != null && result.size() >= 2) {
                long allowed = result.get(0);
                long remainingOrRetry = result.get(1);

                if (allowed == 1) {
                    // Request allowed
                    response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerMinute));
                    response.setHeader("X-RateLimit-Remaining", String.valueOf(remainingOrRetry));
                    response.setHeader("X-RateLimit-Reset", String.valueOf((now + windowMs) / 1000));
                    filterChain.doFilter(request, response);
                } else {
                    // Rate limited
                    response.setStatus(429); // HttpServletResponse.SC_TOO_MANY_REQUESTS
                    response.setHeader("Retry-After", String.valueOf(remainingOrRetry));
                    response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerMinute));
                    response.setHeader("X-RateLimit-Remaining", "0");
                    response.setHeader("X-RateLimit-Reset", String.valueOf((now + windowMs) / 1000));
                    response.setContentType("application/json");
                    response.getWriter().write("""
                            {"error": "Rate limit exceeded", "message": "Too many requests. Please wait before submitting again.", "retryAfterSeconds": %d}
                            """.formatted(remainingOrRetry));
                }
            } else {
                // Script execution failed - fail open (allow request) but log error
                log.warn("Rate limit script returned unexpected result, allowing request");
                filterChain.doFilter(request, response);
            }
        } catch (Exception e) {
            // Redis unavailable - fail open but log
            log.error("Rate limiting error (fail-open): {}", e.getMessage(), e);
            filterChain.doFilter(request, response);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) {
            return ip;
        }
        return request.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Skip rate limiting for health checks and static resources
        String path = request.getRequestURI();
        return path.startsWith("/actuator") ||
                path.startsWith("/h2-console") ||
                path.matches(".*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$");
    }
}