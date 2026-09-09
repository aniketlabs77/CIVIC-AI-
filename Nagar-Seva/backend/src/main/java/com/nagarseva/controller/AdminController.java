package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintStatus;
import com.nagarseva.service.AuditService;
import com.nagarseva.service.ComplaintService;
import com.nagarseva.service.PhotoForensicsService;
import com.nagarseva.service.WebSocketNotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private com.nagarseva.service.GeminiService geminiService;

    @Autowired
    private PhotoForensicsService photoForensicsService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private WebSocketNotificationService wsNotificationService;

    /**
     * GET /api/admin/complaints - Get all complaints with pagination (admin view)
     */
    @GetMapping("/complaints")
    public ResponseEntity<org.springframework.data.domain.Page<Complaint>> getAllComplaints(
            @org.springframework.data.web.PageableDefault(size = 10, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC)
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Complaint> complaints = complaintService.getAllComplaints(pageable);
        return ResponseEntity.ok(complaints);
    }

    /**
     * PATCH /api/admin/complaints/{id}/resolve - Mark complaint as resolved with photo, note and AI verification
     * Includes photo forensics validation (EXIF GPS + timestamp verification)
     */
    @PatchMapping("/complaints/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(
            @PathVariable Long id,
            @RequestBody Map<String, String> resolution,
            HttpServletRequest request) {

        String resolutionPhotoUrl = resolution.get("resolutionPhotoUrl");
        String resolutionNote = resolution.get("resolutionNote");

        if (resolutionPhotoUrl == null || resolutionPhotoUrl.isBlank()) {
            Map<String, String> error = Map.of("error", "Resolution photo is required");
            return ResponseEntity.badRequest().body(error);
        }

        if (resolutionNote == null || resolutionNote.isBlank()) {
            Map<String, String> error = Map.of("error", "Resolution note is required");
            return ResponseEntity.badRequest().body(error);
        }

        Optional<Complaint> existingComplaintOpt = complaintService.getComplaintById(id);
        if (existingComplaintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Complaint complaint = existingComplaintOpt.get();

        // 1. Photo forensics validation for resolution photo (stricter rules)
        PhotoForensicsService.ValidationResult validation = photoForensicsService.validateResolutionPhoto(
                resolutionPhotoUrl,
                complaint.getLatitude(),
                complaint.getLongitude(),
                complaint.getCreatedAt()
        );

        if (!validation.valid()) {
            auditService.logAdminAction(
                    getCurrentUserEmail(request), getCurrentUserRole(request),
                    "RESOLUTION_REJECTED", "Complaint", id,
                    null, Map.of("error", validation.errorMessage()),
                    request, false, validation.errorMessage()
            );
            Map<String, Object> error = Map.of(
                    "error", "Resolution photo validation failed",
                    "details", validation.errorMessage(),
                    "forensics", validation.forensics()
            );
            return ResponseEntity.badRequest().body(error);
        }

        String beforePhoto = complaint.getPhotoData() != null && !complaint.getPhotoData().isBlank()
                ? complaint.getPhotoData()
                : complaint.getPhotoUrl();
        String areaReferencePhoto = complaint.getAreaReferencePhotoUrl();

        // 2. Run Gemini Vision resolution verification with 3 images: areaReference + beforePhoto + resolutionPhoto
        com.nagarseva.service.GeminiService.ResolutionVerificationResult verificationResult =
                geminiService.verifyResolutionProof(
                        complaint.getCategory(),
                        resolutionNote,
                        beforePhoto,
                        resolutionPhotoUrl,
                        areaReferencePhoto
                );

        // 3. Upload resolution photo to object storage if enabled
        if (complaint.getResolutionPhotoObjectKey() == null) {
            // Could upload here if object storage is configured
        }

        // 4. Update complaint status
        ComplaintStatus oldStatus = complaint.getStatus();
        complaint.setStatus(com.nagarseva.entity.ComplaintStatus.RESOLVED);
        complaint.setResolvedAt(java.time.LocalDateTime.now());
        complaint.setResolutionPhotoUrl(resolutionPhotoUrl);
        complaint.setResolutionNote(resolutionNote);
        complaint.setResolutionVerified(verificationResult.resolutionVerified());
        complaint.setResolutionVerificationNote(verificationResult.resolutionVerificationNote());

        complaintService.updateComplaint(complaint.getId(), complaint);

        // 5. Audit log
        auditService.logComplaintResolved(
                getCurrentUserEmail(request), getCurrentUserRole(request),
                id, Map.of(
                        "resolutionPhotoUrl", resolutionPhotoUrl,
                        "resolutionNote", resolutionNote,
                        "verification", verificationResult
                ), request
        );

        // 6. Real-time notification to citizen
        if (complaint.getCitizen() != null && complaint.getCitizen().getEmail() != null) {
            wsNotificationService.notifyCitizenComplaintUpdate(
                    complaint.getCitizen().getEmail(), id, oldStatus,
                    com.nagarseva.entity.ComplaintStatus.RESOLVED,
                    "Your complaint has been resolved by " + complaint.getRoutedAuthority()
            );
        }

        // 7. Broadcast to department
        wsNotificationService.notifyDepartmentNewComplaint(
                complaint.getRoutedAuthority(), id, complaint.getCategory(), complaint.getLocation()
        );

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Complaint marked as resolved");
        response.put("complaint", complaint);
        response.put("verification", verificationResult);
        response.put("forensics", validation.forensics());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/stats - Get admin dashboard stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(complaintService.getDashboardStats());
    }

    private String getCurrentUserEmail(HttpServletRequest request) {
        String email = request.getHeader("X-User-Email");
        return email != null ? email : "admin@municipal";
    }

    private String getCurrentUserRole(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        return role != null ? role : "ADMIN";
    }
}