package com.nagarseva.service;

import com.nagarseva.entity.Complaint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.scheduling.annotation.Async;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired(required = false)
    private JavaMailSender mailSender;

    // In-memory circular notification log (stores up to 150 recent notifications)
    private final Deque<NotificationRecord> notificationLogs = new ConcurrentLinkedDeque<>();
    private static final int MAX_LOGS = 150;

    public record NotificationRecord(
            String id,
            String type, // NEW_COMPLAINT, UNRESOLVED_REMINDER, RESOLUTION_CONFIRMED, ESCALATION_ALERT
            Long complaintId,
            String category,
            String ward,
            String recipientEmail,
            String recipientRole, // AUTHORITY, CITIZEN
            String subject,
            String body,
            LocalDateTime sentAt,
            String status // DELIVERED, DISPATCHED
    ) {}

    @Async
    protected void sendEmailAsync(String to, String subject, String text, Long complaintId, String statusType) {
        if (mailSender == null) {
            log.warn("NOTIFICATION_FAILED complaintId={} to={} status={} reason=\"JavaMailSender is not configured. Missing SMTP configuration.\"", complaintId, to, statusType);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, true); // HTML true
            helper.setFrom("noreply@nagarseva.gov.in");
            mailSender.send(message);
            log.info("NOTIFICATION_SENT complaintId={} to={} status={}", complaintId, to, statusType);
        } catch (Exception e) {
            log.error("NOTIFICATION_FAILED complaintId={} to={} status={} reason=\"{}\"", complaintId, to, statusType, e.getMessage());
        }
    }

    /**
     * Map authority name to their official department email
     */
    public String getAuthorityEmail(String routedAuthority) {
        if (routedAuthority == null) {
            return "municipal.grievances@nagarseva.gov.in";
        }
        String lower = routedAuthority.toLowerCase();
        if (lower.contains("pwd") || lower.contains("public works") || lower.contains("road")) {
            return "pwd.repairs@nagarseva.gov.in";
        } else if (lower.contains("electric") || lower.contains("light") || lower.contains("power")) {
            return "electricity.board@nagarseva.gov.in";
        } else if (lower.contains("water") || lower.contains("drain") || lower.contains("sewer") || lower.contains("jal")) {
            return "jal.board@nagarseva.gov.in";
        } else if (lower.contains("sanitation") || lower.contains("waste") || lower.contains("dump") || lower.contains("garbage")) {
            return "sanitation.dept@nagarseva.gov.in";
        } else if (lower.contains("police") || lower.contains("safety") || lower.contains("surveillance")) {
            return "police.patrol@nagarseva.gov.in";
        } else if (lower.contains("encroach")) {
            return "encroachment.cell@nagarseva.gov.in";
        }
        return "municipal.grievances@nagarseva.gov.in";
    }

    /**
     * Send official notification to the municipal authority & citizen upon complaint creation
     */
    public void sendNewComplaintEmail(Complaint complaint) {
        String authorityEmail = getAuthorityEmail(complaint.getRoutedAuthority());
        String citizenEmail = (complaint.getCitizen() != null && complaint.getCitizen().getEmail() != null)
                ? complaint.getCitizen().getEmail()
                : "citizen@nagarseva.com";

        // 1. Email to Assigned Municipal Authority
        String authSubject = String.format("🚨 [NEW GRIEVANCE TICKET #%d] %s - %s (%s Priority)",
                complaint.getId(), complaint.getCategory(), complaint.getWard(), complaint.getPriority());

        String authBody = String.format("""
                OFFICIAL MUNICIPAL REDRESSAL DISPATCH
                ------------------------------------------------------------
                Ticket ID: #%d
                Problem Category: %s
                Municipal Ward: %s
                Location / Landmark: %s
                GPS Coordinates: (%.5f, %.5f)
                Assigned Authority: %s
                Assessed Priority: %s
                AI Image Verified: %s
                AI Summary: %s
                Date & Time Filed: %s
                
                Citizen Description:
                "%s"
                
                ACTION REQUIRED:
                This issue has been routed to your department for prompt inspection and remediation.
                Mandatory resolution protocol: Upload 'After Resolution' photo proof upon completion.
                Action Portal: http://localhost:5173/admin
                ------------------------------------------------------------
                NagarSeva Automated Governance Dispatch
                """,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getWard(),
                complaint.getLocation(),
                complaint.getLatitude(),
                complaint.getLongitude(),
                complaint.getRoutedAuthority(),
                complaint.getPriority(),
                Boolean.TRUE.equals(complaint.getImageVerified()) ? "YES (Gemini Vision Verified)" : "NO / Not Provided",
                complaint.getAiSummary() != null ? complaint.getAiSummary() : "Under review",
                complaint.getCreatedAt() != null ? complaint.getCreatedAt().format(FORMATTER) : LocalDateTime.now().format(FORMATTER),
                complaint.getDescription()
        );

        recordNotification("NEW_COMPLAINT", complaint, authorityEmail, "AUTHORITY", authSubject, authBody);
        log.info("📧 [DISPATCHED TO AUTHORITY] {} -> Ticket #{} ({})", authorityEmail, complaint.getId(), complaint.getCategory());

        // 2. Email Receipt to Citizen
        String citizenSubject = String.format("✅ [NagarSeva Ticket #%d] Your %s Grievance Has Been Registered",
                complaint.getId(), complaint.getCategory());

        String citizenBody = String.format("""
                Dear Citizen,
                
                Your civic grievance has been successfully registered on the NagarSeva Municipal Portal.
                
                Ticket Number: #%d
                Issue Category: %s
                Assigned Department: %s
                Ward: %s
                Status: OPEN
                
                What happens next?
                1. Your assigned department (%s) has received the grievance dispatch.
                2. Our automated monitor will notify both you and the department periodically until the issue is fixed.
                3. Once repairs are finished, the officer must upload photographic proof before closing the ticket.
                
                Track your grievance anytime:
                http://localhost:5173/my-complaints
                
                Thank you for contributing to a cleaner and safer city!
                NagarSeva Grievance Cell
                """,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getRoutedAuthority(),
                complaint.getWard(),
                complaint.getRoutedAuthority()
        );

        recordNotification("NEW_COMPLAINT", complaint, citizenEmail, "CITIZEN", citizenSubject, citizenBody);
        log.info("📧 [DISPATCHED TO CITIZEN] {} -> Ticket #{} Registered", citizenEmail, complaint.getId());
    }

    /**
     * Send periodic recurring reminder to BOTH authority and citizen while the issue remains unresolved
     */
    public void sendUnresolvedReminderEmail(Complaint complaint, long minutesUnresolved) {
        String authorityEmail = getAuthorityEmail(complaint.getRoutedAuthority());
        String citizenEmail = (complaint.getCitizen() != null && complaint.getCitizen().getEmail() != null)
                ? complaint.getCitizen().getEmail()
                : "citizen@nagarseva.com";

        int reminderNumber = complaint.getReminderCount() != null ? complaint.getReminderCount() + 1 : 1;

        // 1. Reminder to Authority
        String authSubject = String.format("⚠️ [UNRESOLVED REMINDER #%d - TICKET #%d] %s (%s) Still Pending for %d Minutes",
                reminderNumber, complaint.getId(), complaint.getCategory(), complaint.getWard(), minutesUnresolved);

        String authBody = String.format("""
                URGENT MUNICIPAL REMINDER & ESCALATION NOTICE
                ------------------------------------------------------------
                Ticket ID: #%d
                Category: %s
                Ward: %s
                Location: %s
                Current Status: %s
                Time Elapsed: %d minutes (Pending Resolution)
                Assigned Department: %s
                Escalated Flag: %s
                
                ATTENTION:
                This civic defect has NOT been resolved yet. Immediate field action is requested.
                Citizens are actively tracking this ticket.
                
                Resolve and upload proof: http://localhost:5173/admin
                ------------------------------------------------------------
                NagarSeva Automated Escalation Monitor
                """,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getWard(),
                complaint.getLocation(),
                complaint.getStatus(),
                minutesUnresolved,
                complaint.getRoutedAuthority(),
                Boolean.TRUE.equals(complaint.getEscalated()) ? "YES (SLA Breached)" : "NO"
        );

        recordNotification("UNRESOLVED_REMINDER", complaint, authorityEmail, "AUTHORITY", authSubject, authBody);
        log.warn("🔔 [UNRESOLVED REMINDER TO AUTHORITY] {} -> Ticket #{} pending for {}m (Reminder #{})",
                authorityEmail, complaint.getId(), minutesUnresolved, reminderNumber);

        // 2. Status Update to Citizen
        String citizenSubject = String.format("🔔 [Status Update] Ticket #%d (%s) is under active municipal follow-up",
                complaint.getId(), complaint.getCategory());

        String citizenBody = String.format("""
                Dear Citizen,
                
                This is an automated status update regarding your registered grievance:
                
                Ticket ID: #%d
                Category: %s
                Status: %s (Duration: %d minutes)
                Responsible Authority: %s (%s)
                
                We have dispatched a reminder alert to the municipal department urging expedited resolution.
                You will receive another update when repairs progress or are finalized.
                
                Track live progress: http://localhost:5173/my-complaints
                
                NagarSeva Citizen Support
                """,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getStatus(),
                minutesUnresolved,
                complaint.getRoutedAuthority(),
                authorityEmail
        );

        recordNotification("UNRESOLVED_REMINDER", complaint, citizenEmail, "CITIZEN", citizenSubject, citizenBody);
        log.info("🔔 [UNRESOLVED UPDATE TO CITIZEN] {} -> Ticket #{} reminder #{} sent",
                citizenEmail, complaint.getId(), reminderNumber);
    }

    /**
     * Send final resolution confirmation email to citizen
     */
    public void sendResolutionEmail(Complaint complaint) {
        String citizenEmail = (complaint.getCitizen() != null && complaint.getCitizen().getEmail() != null)
                ? complaint.getCitizen().getEmail()
                : "citizen@nagarseva.com";

        String subject = String.format("🎉 [RESOLVED] Ticket #%d (%s) Has Been Successfully Closed!",
                complaint.getId(), complaint.getCategory());

        String body = String.format("""
                Dear Citizen,
                
                Great news! Your grievance has been marked as RESOLVED by the municipal authority.
                
                Ticket ID: #%d
                Category: %s
                Ward: %s
                Location: %s
                Resolved By: %s
                Resolution Time: %s
                
                Officer Resolution Note:
                "%s"
                
                Photo Verification:
                %s
                
                View resolution details: http://localhost:5173/my-complaints
                
                Thank you for using NagarSeva to improve our city!
                """,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getWard(),
                complaint.getLocation(),
                complaint.getRoutedAuthority(),
                complaint.getResolvedAt() != null ? complaint.getResolvedAt().format(FORMATTER) : LocalDateTime.now().format(FORMATTER),
                complaint.getResolutionNote() != null ? complaint.getResolutionNote() : "Work verified and completed.",
                complaint.getResolutionPhotoUrl() != null ? "Photographic proof uploaded and verified by AI." : "Field work inspected."
        );

        recordNotification("RESOLUTION_CONFIRMED", complaint, citizenEmail, "CITIZEN", subject, body);
        log.info("🎉 [RESOLUTION EMAIL] {} -> Ticket #{} RESOLVED", citizenEmail, complaint.getId());
    }

    private void recordNotification(String type, Complaint complaint, String recipientEmail, String recipientRole, String subject, String body) {
        // Check preferences before attempting to send
        boolean shouldSend = true;
        if ("CITIZEN".equals(recipientRole)) {
            if (complaint.getCitizen() != null && !complaint.getCitizen().isNotificationsEnabled()) {
                shouldSend = false;
                log.info("NOTIFICATION_SKIPPED complaintId={} to={} status={} reason=\"User disabled notifications\"", 
                         complaint.getId(), recipientEmail, type);
            }
        }

        // Send actual email via JavaMailSender
        if (shouldSend) {
            sendEmailAsync(recipientEmail, subject, body.replace("\n", "<br>"), complaint.getId(), type);
        }

        NotificationRecord record = new NotificationRecord(
                UUID.randomUUID().toString().substring(0, 8),
                type,
                complaint.getId(),
                complaint.getCategory(),
                complaint.getWard(),
                recipientEmail,
                recipientRole,
                subject,
                body,
                LocalDateTime.now(),
                shouldSend ? "DISPATCHED" : "SKIPPED_PREFERENCE"
        );

        notificationLogs.addFirst(record);
        while (notificationLogs.size() > MAX_LOGS) {
            notificationLogs.removeLast();
        }
    }

    /**
     * Get recent notifications log
     */
    public List<NotificationRecord> getRecentNotifications() {
        return new ArrayList<>(notificationLogs);
    }
}
