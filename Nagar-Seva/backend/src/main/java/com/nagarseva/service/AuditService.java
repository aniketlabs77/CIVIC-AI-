package com.nagarseva.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nagarseva.entity.AuditLog;
import com.nagarseva.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Async audit logging service for immutable audit trail.
 * All writes are fire-and-forget to not block main request flow.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Log an audit event asynchronously.
     */
    @Async("auditExecutor")
    public void log(String actorEmail, String actorRole, String action,
                    String entityType, Long entityId,
                    Object oldValue, Object newValue,
                    HttpServletRequest request, Boolean success, String errorMessage) {
        try {
            String oldJson = oldValue != null ? toJson(oldValue) : null;
            String newJson = newValue != null ? toJson(newValue) : null;

            String ipAddress = extractClientIp(request);
            String userAgent = request != null ? request.getHeader("User-Agent") : null;
            String requestId = request != null ? request.getHeader("X-Request-ID") : null;

            AuditLog auditLog = new AuditLog(
                    actorEmail, actorRole, action, entityType, entityId,
                    oldJson, newJson, ipAddress, userAgent, requestId, success, errorMessage
            );

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // Never throw from audit logging - log and continue
            log.error("Failed to write audit log: {}", e.getMessage(), e);
        }
    }

    /**
     * Synchronous logging for critical operations that must not fail silently.
     */
    public void logSync(String actorEmail, String actorRole, String action,
                        String entityType, Long entityId,
                        Object oldValue, Object newValue,
                        HttpServletRequest request, Boolean success, String errorMessage) {
        try {
            String oldJson = oldValue != null ? toJson(oldValue) : null;
            String newJson = newValue != null ? toJson(newValue) : null;

            String ipAddress = extractClientIp(request);
            String userAgent = request != null ? request.getHeader("User-Agent") : null;
            String requestId = request != null ? request.getHeader("X-Request-ID") : null;

            AuditLog auditLog = new AuditLog(
                    actorEmail, actorRole, action, entityType, entityId,
                    oldJson, newJson, ipAddress, userAgent, requestId, success, errorMessage
            );

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write synchronous audit log: {}", e.getMessage(), e);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return value.toString();
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;

        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            // X-Forwarded-For can contain multiple IPs, take the first (original client)
            return ip.split(",")[0].trim();
        }

        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) {
            return ip;
        }

        return request.getRemoteAddr();
    }

    // Convenience methods for common actions
    public void logComplaintCreated(String actorEmail, String actorRole, Long complaintId,
                                    Object complaintData, HttpServletRequest request) {
        log(actorEmail, actorRole, "COMPLAINT_CREATED", "Complaint", complaintId,
                null, complaintData, request, true, null);
    }

    public void logComplaintStatusChanged(String actorEmail, String actorRole, Long complaintId,
                                          String oldStatus, String newStatus,
                                          HttpServletRequest request) {
        log(actorEmail, actorRole, "COMPLAINT_STATUS_CHANGED", "Complaint", complaintId,
                Map.of("status", oldStatus), Map.of("status", newStatus), request, true, null);
    }

    public void logComplaintResolved(String actorEmail, String actorRole, Long complaintId,
                                     Object resolutionData, HttpServletRequest request) {
        log(actorEmail, actorRole, "COMPLAINT_RESOLVED", "Complaint", complaintId,
                null, resolutionData, request, true, null);
    }

    public void logResolutionVerification(String actorEmail, String actorRole, Long complaintId,
                                          boolean verified, String note,
                                          HttpServletRequest request) {
        log(actorEmail, actorRole, "RESOLUTION_VERIFICATION", "Complaint", complaintId,
                null, Map.of("verified", verified, "note", note), request, true, null);
    }

    public void logAdminAction(String actorEmail, String actorRole, String action,
                               String entityType, Long entityId,
                               Object oldValue, Object newValue,
                               HttpServletRequest request, boolean success, String error) {
        log(actorEmail, actorRole, action, entityType, entityId,
                oldValue, newValue, request, success, error);
    }

    public void logLogin(String actorEmail, String actorRole, HttpServletRequest request, boolean success) {
        log(actorEmail, actorRole, success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
                "User", null, null, null, request, success, success ? null : "Authentication failed");
    }

    public void logSlaConfigChanged(String actorEmail, String actorRole, String category,
                                    String department, Object oldConfig, Object newConfig,
                                    HttpServletRequest request) {
        String compositeKey = category + "|" + department;
        Long entityId = compositeKey.hashCode();
        log(actorEmail, actorRole, "SLA_CONFIG_CHANGED", "SlaConfig", entityId,
                oldConfig, newConfig, request, true, null);
    }
}