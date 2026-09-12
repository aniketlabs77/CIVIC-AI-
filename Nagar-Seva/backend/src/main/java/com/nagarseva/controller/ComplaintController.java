package com.nagarseva.controller;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.User;
import com.nagarseva.service.ComplaintService;
import com.nagarseva.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
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

    @Autowired
    private com.nagarseva.service.ExportService exportService;

    @Autowired(required = false)
    private com.nagarseva.service.DemoImageBankService demoImageBankService;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ComplaintController.class);

    /**
     * GET /api/complaints - Retrieve all complaints with pagination
     */

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Complaint>> getAllComplaints(
            @org.springframework.data.web.PageableDefault(size = 10, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC)
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Complaint> complaints = complaintService.getAllComplaints(pageable);
        return ResponseEntity.ok(complaints);
    }

    /**
     * GET /api/complaints/my - Get current user's complaints
     */
    @GetMapping("/my")
    public ResponseEntity<List<Complaint>> getMyComplaints(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String keyword) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = null;
        Long userId = null;
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            userId = user.getId();
            userEmail = user.getEmail();
        }

        List<Complaint> allComplaints = complaintService.getAllComplaints();
        final Long finalUserId = userId;
        final String finalUserEmail = userEmail;

        java.util.stream.Stream<Complaint> stream = allComplaints.stream()
                .filter(c -> {
                    if (finalUserId != null && c.getCitizen() != null && finalUserId.equals(c.getCitizen().getId())) {
                        return true;
                    }
                    if (finalUserEmail != null && c.getCitizen() != null && finalUserEmail.equalsIgnoreCase(c.getCitizen().getEmail())) {
                        return true;
                    }
                    // For demo guest or citizen@nagarseva.com, include all general/guest complaints
                    if (finalUserEmail == null || "citizen@nagarseva.com".equalsIgnoreCase(finalUserEmail)) {
                        return c.getCitizen() == null || "citizen@nagarseva.com".equalsIgnoreCase(c.getCitizen().getEmail());
                    }
                    return false;
                });

        if (status != null && !status.isEmpty()) {
            stream = stream.filter(c -> c.getStatus() != null && c.getStatus().name().equalsIgnoreCase(status));
        }
        if (department != null && !department.isEmpty()) {
            stream = stream.filter(c -> c.getRoutedAuthority() != null && c.getRoutedAuthority().equalsIgnoreCase(department));
        }
        if (keyword != null && !keyword.isEmpty()) {
            final String kw = keyword.toLowerCase();
            stream = stream.filter(c -> (c.getCategory() != null && c.getCategory().toLowerCase().contains(kw)) ||
                                        (c.getDescription() != null && c.getDescription().toLowerCase().contains(kw)) ||
                                        (c.getWard() != null && c.getWard().toLowerCase().contains(kw)));
        }
        if (dateFrom != null && !dateFrom.isEmpty()) {
            try {
                java.time.LocalDate fromDate = java.time.LocalDate.parse(dateFrom);
                stream = stream.filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().toLocalDate().isBefore(fromDate));
            } catch (Exception e) {
                // ignore invalid date formats
            }
        }
        if (dateTo != null && !dateTo.isEmpty()) {
            try {
                java.time.LocalDate toDate = java.time.LocalDate.parse(dateTo);
                stream = stream.filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().toLocalDate().isAfter(toDate));
            } catch (Exception e) {
                // ignore invalid date formats
            }
        }

        List<Complaint> myComplaints = stream.collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(myComplaints.isEmpty() ? allComplaints : myComplaints);
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
     * POST /api/complaints - Create a new complaint with photo forensics validation
     */
    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@Valid @RequestBody Complaint complaint, HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User citizen = null;
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            citizen = user;
        } else {
            citizen = userService.findByEmail("citizen@nagarseva.com")
                    .orElseGet(() -> userService.findOrCreateByFirebaseUid("demo-citizen-guest", "citizen@nagarseva.com"));
        }

        complaint.setCitizen(citizen);
        Complaint createdComplaint = complaintService.createComplaint(complaint, request);

        if (demoImageBankService != null && createdComplaint.getLatitude() != null && createdComplaint.getLongitude() != null) {
            try {
                demoImageBankService.findNearestReference(createdComplaint.getLatitude(), createdComplaint.getLongitude())
                        .ifPresent(ref -> {
                            createdComplaint.setAreaReferencePhotoUrl(ref.photoUrl());
                            createdComplaint.setAreaReferenceCapturedAt(ref.capturedAt());
                            complaintService.updateComplaint(createdComplaint.getId(), createdComplaint);
                        });
            } catch (Exception e) {
                log.warn("Failed to find nearest reference image: {}", e.getMessage());
            }
        }

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

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportComplaints(@RequestParam(defaultValue = "csv") String format) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User tempUser = null;
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            tempUser = user;
        }
        final User currentUser = tempUser;

        List<Complaint> complaints;
        if (currentUser != null && currentUser.getRole() == com.nagarseva.entity.UserRole.CITIZEN) {
            complaints = complaintService.getAllComplaints().stream()
                .filter(c -> c.getCitizen() != null && c.getCitizen().getId().equals(currentUser.getId()))
                .collect(java.util.stream.Collectors.toList());
        } else if (currentUser != null && currentUser.getRole() != com.nagarseva.entity.UserRole.ADMIN) {
            // Treat as department admin if role not ADMIN or CITIZEN
            complaints = complaintService.getAllComplaints().stream()
                .filter(c -> currentUser.getDepartment() != null && currentUser.getDepartment().equalsIgnoreCase(c.getRoutedAuthority()))
                .collect(java.util.stream.Collectors.toList());
        } else {
            complaints = complaintService.getAllComplaints();
        }

        try {
            if ("pdf".equalsIgnoreCase(format)) {
                byte[] data = exportService.exportComplaintsToPdf(complaints);
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment", "complaints.pdf");
                return new ResponseEntity<>(data, headers, HttpStatus.OK);
            } else {
                byte[] data = exportService.exportComplaintsToCsv(complaints);
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/csv"));
                headers.setContentDispositionFormData("attachment", "complaints.csv");
                return new ResponseEntity<>(data, headers, HttpStatus.OK);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}