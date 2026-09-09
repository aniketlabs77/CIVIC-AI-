package com.nagarseva.service;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Real-time WebSocket notifications for complaint status updates.
 * Citizens and admins receive instant updates without polling.
 */
@Service
public class WebSocketNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketNotificationService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Notify a specific citizen about their complaint status change.
     */
    public void notifyCitizenComplaintUpdate(String citizenEmail, Long complaintId,
                                             ComplaintStatus oldStatus, ComplaintStatus newStatus,
                                             String message) {
        try {
            ComplaintStatusUpdate update = new ComplaintStatusUpdate(
                    complaintId, oldStatus, newStatus, message, LocalDateTime.now()
            );
            messagingTemplate.convertAndSendToUser(
                    citizenEmail, "/queue/complaints", update
            );
            log.debug("Sent complaint update to user: {}", citizenEmail);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification to {}: {}", citizenEmail, e.getMessage());
        }
    }

    /**
     * Broadcast to all admins in a department about new complaint.
     */
    public void notifyDepartmentNewComplaint(String department, Long complaintId, String category, String location) {
        try {
            NewComplaintNotification notification = new NewComplaintNotification(
                    complaintId, category, location, LocalDateTime.now()
            );
            messagingTemplate.convertAndSend(
                    "/topic/admin/" + department.toLowerCase().replaceAll("[^a-z0-9]", "-"),
                    notification
            );
            log.debug("Broadcasted new complaint to department: {}", department);
        } catch (Exception e) {
            log.warn("Failed to broadcast to department {}: {}", department, e.getMessage());
        }
    }

    /**
     * Broadcast to all super-admins.
     */
    public void notifySuperAdmins(String eventType, Object data) {
        try {
            messagingTemplate.convertAndSend("/topic/admin/super", Map.of(
                    "type", eventType,
                    "data", data,
                    "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.warn("Failed to notify super admins: {}", e.getMessage());
        }
    }

    /**
     * Notify about escalation.
     */
    public void notifyEscalation(Long complaintId, String department, String reason) {
        try {
            EscalationNotification notification = new EscalationNotification(
                    complaintId, department, reason, LocalDateTime.now()
            );
            messagingTemplate.convertAndSend(
                    "/topic/admin/" + department.toLowerCase().replaceAll("[^a-z0-9]", "-"),
                    notification
            );
            messagingTemplate.convertAndSend("/topic/admin/super", Map.of(
                    "type", "ESCALATION",
                    "data", notification,
                    "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.warn("Failed to send escalation notification: {}", e.getMessage());
        }
    }

    /**
     * Broadcast public dashboard stats update.
     */
    public void broadcastDashboardUpdate(Map<String, Object> stats) {
        try {
            messagingTemplate.convertAndSend("/topic/public/dashboard", Map.of(
                    "type", "STATS_UPDATE",
                    "data", stats,
                    "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.warn("Failed to broadcast dashboard update: {}", e.getMessage());
        }
    }

    // Data classes for WebSocket messages
    public record ComplaintStatusUpdate(
            Long complaintId,
            ComplaintStatus oldStatus,
            ComplaintStatus newStatus,
            String message,
            LocalDateTime timestamp
    ) {}

    public record NewComplaintNotification(
            Long complaintId,
            String category,
            String location,
            LocalDateTime timestamp
    ) {}

    public record EscalationNotification(
            Long complaintId,
            String department,
            String reason,
            LocalDateTime timestamp
    ) {}
}