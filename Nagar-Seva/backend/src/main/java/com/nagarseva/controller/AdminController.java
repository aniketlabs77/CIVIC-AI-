package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.service.ComplaintService;
import com.nagarseva.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private UserService userService;

    @GetMapping("/complaints")
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintService.getAllComplaints();
        return ResponseEntity.ok(complaints);
    }

    @PatchMapping("/complaints/{id}/resolve")
    @Transactional
    public ResponseEntity<?> resolveComplaint(
            @PathVariable Long id,
            @RequestBody Map<String, String> resolution) {
        try {
            String resolutionPhotoUrl = resolution.get("resolutionPhotoUrl");
            String resolutionNote = resolution.get("resolutionNote");

            if (resolutionPhotoUrl == null || resolutionPhotoUrl.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Resolution photo is required"));
            }
            if (resolutionNote == null || resolutionNote.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Resolution note is required"));
            }

            Optional<Complaint> updatedComplaint = complaintService.updateComplaintStatus(id, "RESOLVED");
            if (updatedComplaint.isPresent()) {
                Complaint complaint = updatedComplaint.get();
                complaint.setResolutionPhotoUrl(resolutionPhotoUrl);
                complaint.setResolutionNote(resolutionNote);
                complaintService.updateComplaint(complaint.getId(), complaint);
                log.info("Complaint {} resolved successfully", id);
                return ResponseEntity.ok(Map.of("message", "Complaint resolved", "complaint", complaint));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error resolving complaint {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(complaintService.getDashboardStats());
    }
}