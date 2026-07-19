package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintStatus;
import com.nagarseva.service.ComplaintService;
import com.nagarseva.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    private UserService userService;

    /**
     * GET /api/admin/complaints - Get all complaints (admin view)
     */
    @GetMapping("/complaints")
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintService.getAllComplaints();
        return ResponseEntity.ok(complaints);
    }

    /**
     * PATCH /api/admin/complaints/{id}/resolve - Mark complaint as resolved with photo and note
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

        Optional<Complaint> updatedComplaint = complaintService.updateComplaintStatus(id, "RESOLVED");
        
        if (updatedComplaint.isPresent()) {
            Complaint complaint = updatedComplaint.get();
            complaint.setResolutionPhotoUrl(resolutionPhotoUrl);
            complaint.setResolutionNote(resolutionNote);
            complaintService.updateComplaint(complaint.getId(), complaint);
            
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Complaint marked as resolved");
            response.put("complaint", complaint);
            return ResponseEntity.ok(response);
        } else {
            Map<String, String> error = Map.of("error", "Complaint not found");
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/admin/stats - Get admin dashboard stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(complaintService.getDashboardStats());
    }
}