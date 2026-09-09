package com.nagarseva.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Servlet filter providing IP-based in-memory rate limiting for unauthenticated
 * public write endpoints (specifically POST /api/complaints).
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Value("${app.rate-limiting.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limiting.requests-per-minute:5}")
    private int requestsPerMinute;

    private final Map<String, IpRateTracker> ipTrackers = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/complaints".equals(path)) {
            String clientIp = getClientIp(request);
            IpRateTracker tracker = ipTrackers.computeIfAbsent(clientIp, k -> new IpRateTracker());

            if (!tracker.allowRequest(requestsPerMinute)) {
                log.warn("Rate limit exceeded for IP {} on {} {}: limit is {} req/min",
                        clientIp, request.getMethod(), path, requestsPerMinute);

                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setHeader("Retry-After", "60");

                String jsonResponse = String.format(
                        "{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Maximum %d complaint submissions allowed per minute.\"}",
                        requestsPerMinute
                );
                response.getWriter().write(jsonResponse);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Clear all trackers (useful for test resets).
     */
    public void reset() {
        ipTrackers.clear();
    }

    private static class IpRateTracker {
        private final Queue<Long> requestTimestamps = new ConcurrentLinkedQueue<>();

        public synchronized boolean allowRequest(int maxRequestsPerMinute) {
            long now = System.currentTimeMillis();
            long oneMinuteAgo = now - 60_000L;

            while (!requestTimestamps.isEmpty() && requestTimestamps.peek() < oneMinuteAgo) {
                requestTimestamps.poll();
            }

            if (requestTimestamps.size() < maxRequestsPerMinute) {
                requestTimestamps.offer(now);
                return true;
            }
            return false;
        }
    }
}
