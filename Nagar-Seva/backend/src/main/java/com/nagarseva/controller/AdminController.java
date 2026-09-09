package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.service.ComplaintService;
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
     */
    @PatchMapping("/complaints/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(
            @PathVariable Long id,
            @RequestBody Map<String, String> resolution) {
        
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

        String beforePhoto = complaint.getPhotoData() != null && !complaint.getPhotoData().isBlank()
                ? complaint.getPhotoData()
                : complaint.getPhotoUrl();
        String areaReferencePhoto = complaint.getAreaReferencePhotoUrl();

        // Run Gemini Vision resolution verification with 3 images: areaReference + beforePhoto + resolutionPhoto
        com.nagarseva.service.GeminiService.ResolutionVerificationResult verificationResult =
                geminiService.verifyResolutionProof(
                        complaint.getCategory(),
                        resolutionNote,
                        beforePhoto,
                        resolutionPhotoUrl,
                        areaReferencePhoto
                );

        complaint.setStatus(com.nagarseva.entity.ComplaintStatus.RESOLVED);

        complaint.setResolvedAt(java.time.LocalDateTime.now());
        complaint.setResolutionPhotoUrl(resolutionPhotoUrl);
        complaint.setResolutionNote(resolutionNote);
        complaint.setResolutionVerified(verificationResult.resolutionVerified());
        complaint.setResolutionVerificationNote(verificationResult.resolutionVerificationNote());

        complaintService.updateComplaint(complaint.getId(), complaint);
        
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Complaint marked as resolved");
        response.put("complaint", complaint);
        response.put("verification", verificationResult);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/stats - Get admin dashboard stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(complaintService.getDashboardStats());
    }
}