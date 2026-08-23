package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.User;
import com.nagarseva.service.ComplaintService;
import com.nagarseva.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private UserService userService;

    /**
     * GET /api/complaints - Retrieve all complaints
     */
    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        List<Complaint> complaints = complaintService.getAllComplaints();
        return ResponseEntity.ok(complaints);
    }

    /**
     * GET /api/complaints/my - Get current user's complaints
     */
    @GetMapping("/my")
    public ResponseEntity<List<Complaint>> getMyComplaints() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long userId = user.getId();
        List<Complaint> allComplaints = complaintService.getAllComplaints();
        List<Complaint> myComplaints = allComplaints.stream()
                .filter(c -> c.getCitizen() != null && c.getCitizen().getId().equals(userId))
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(myComplaints);
    }

    /**
     * GET /api/complaints/{id} - Retrieve complaint by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable Long id) {
        Optional<Complaint> complaint = complaintService.getComplaintById(id);
        return complaint.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * POST /api/complaints - Create a new complaint
     */
    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@Valid @RequestBody Complaint complaint) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        complaint.setCitizen(user);
        Complaint createdComplaint = complaintService.createComplaint(complaint);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdComplaint);
    }

    /**
     * PUT /api/complaints/{id} - Update an existing complaint
     */
    @PutMapping("/{id}")
    public ResponseEntity<Complaint> updateComplaint(@PathVariable Long id, @Valid @RequestBody Complaint complaintDetails) {
        Optional<Complaint> updatedComplaint = complaintService.updateComplaint(id, complaintDetails);
        return updatedComplaint.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/complaints/{id}/status - Update complaint status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Complaint> updateComplaintStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        String newStatus = statusUpdate.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Optional<Complaint> updatedComplaint = complaintService.updateComplaintStatus(id, newStatus);
        return updatedComplaint.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/complaints/{id}/resolve - Resolve complaint with photo and note
     */
    @PatchMapping("/{id}/resolve")
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
     * DELETE /api/complaints/{id} - Delete a complaint
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComplaint(@PathVariable Long id) {
        if (complaintService.deleteComplaint(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}