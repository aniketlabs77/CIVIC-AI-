package com.nagarseva.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintPriority;
import com.nagarseva.entity.ComplaintStatus;
import com.nagarseva.repository.ComplaintRepository;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ComplaintService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);
    
    // Safety heatmap constants
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double SAFETY_CLUSTER_RADIUS_KM = 0.2; // 200m
    private static final double ROUTE_CHECK_RADIUS_KM = 0.3; // 300m

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private NotificationService notificationService;

    @Value("${app.escalation.threshold-minutes:5}")
    private int escalationThresholdMinutes;

    public ComplaintService() {
    }

    /**
     * Get all complaints (newest first)
     */
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll().stream()
                .sorted((a, b) -> Long.compare(b.getId() != null ? b.getId() : 0, a.getId() != null ? a.getId() : 0))
                .toList();
    }

    /**
     * Get complaints paged with Spring Data Pageable
     */
    public org.springframework.data.domain.Page<Complaint> getAllComplaints(org.springframework.data.domain.Pageable pageable) {
        return complaintRepository.findAll(pageable);
    }

    /**
     * Get complaint by ID
     */
    public Optional<Complaint> getComplaintById(Long id) {
        return complaintRepository.findById(id);
    }

    public static final long MAX_PHOTO_SIZE_BYTES = 2L * 1024L * 1024L; // 2MB

    /**
     * Create a new complaint with AI-powered routing & multimodal image verification
     */
    public Complaint createComplaint(Complaint complaint) {
        // Enforce maximum photo upload payload size (2MB)
        validatePhotoSize(complaint.getPhotoData());

        // Set defaults
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setEscalated(false);
        if (complaint.getStatus() == null) {
            complaint.setStatus(ComplaintStatus.OPEN);
        }
        if (complaint.getWard() == null || complaint.getWard().isBlank()) {
            complaint.setWard("Ward 1");
        }
        
        // Set issueType based on category
        setIssueType(complaint);

        // Analyze and verify using Gemini (multimodal if photo present)
        GeminiService.ComplaintAnalysisResult aiResult = geminiService.classifyAndVerifyComplaint(complaint, complaint.getPhotoData());
        complaint.setRoutedAuthority(aiResult.routedAuthority());
        complaint.setAiSummary(aiResult.aiSummary());
        complaint.setPriority(aiResult.priority());
        complaint.setImageVerified(aiResult.imageVerified());
        complaint.setImageVerificationNote(aiResult.imageVerificationNote());

        log.info("Complaint created: ID={}, authority={}, priority={}, imageVerified={}",
                complaint.getId(), aiResult.routedAuthority(), aiResult.priority(), aiResult.imageVerified());

        Complaint saved = complaintRepository.save(complaint);
        try {
            notificationService.sendNewComplaintEmail(saved);
        } catch (Exception e) {
            log.warn("Failed to send new complaint email: {}", e.getMessage());
        }

        return saved;
    }

    /**
     * Validates that the uploaded base64 photo does not exceed MAX_PHOTO_SIZE_BYTES (2MB)
     */
    public void validatePhotoSize(String photoData) {
        if (photoData == null || photoData.isBlank()) {
            return;
        }
        String base64Content = photoData;
        int commaIdx = base64Content.indexOf(',');
        if (commaIdx != -1) {
            base64Content = base64Content.substring(commaIdx + 1);
        }
        long rawLen = base64Content.length();
        int padding = 0;
        if (rawLen > 0 && base64Content.charAt((int) rawLen - 1) == '=') padding++;
        if (rawLen > 1 && base64Content.charAt((int) rawLen - 2) == '=') padding++;
        long estimatedBytes = (rawLen * 3L / 4L) - padding;

        if (estimatedBytes > MAX_PHOTO_SIZE_BYTES) {
            double mb = (double) estimatedBytes / (1024.0 * 1024.0);
            throw new com.nagarseva.config.PhotoSizeLimitExceededException(
                    String.format("Photo upload exceeds maximum allowed size of 2MB (actual payload: %.2fMB). Please compress or choose a smaller image.", mb)
            );
        }
    }

    /**
     * Set issueType based on category - safety-relevant issues
     */
    private void setIssueType(Complaint complaint) {
        String category = complaint.getCategory();
        if (category != null) {
            switch (category.toLowerCase()) {
                case "unsafe area":
                case "poor lighting":
                case "streetlight":
                    complaint.setIssueType("SAFETY");
                    break;
                default:
                    complaint.setIssueType("INFRASTRUCTURE");
                    break;
            }
        } else {
            complaint.setIssueType("INFRASTRUCTURE");
        }
    }



    /**
     * Update an existing complaint
     */
    public Optional<Complaint> updateComplaint(Long id, Complaint complaintDetails) {
        Optional<Complaint> existingComplaint = complaintRepository.findById(id);
        if (existingComplaint.isPresent()) {
            Complaint complaint = existingComplaint.get();
            if (complaintDetails.getCategory() != null) {
                complaint.setCategory(complaintDetails.getCategory());
                setIssueType(complaint); // Update issueType when category changes
            }
            if (complaintDetails.getDescription() != null) {
                complaint.setDescription(complaintDetails.getDescription());
            }
            if (complaintDetails.getLocation() != null) {
                complaint.setLocation(complaintDetails.getLocation());
            }
            if (complaintDetails.getWard() != null) {
                complaint.setWard(complaintDetails.getWard());
            }
            if (complaintDetails.getLatitude() != null) {
                complaint.setLatitude(complaintDetails.getLatitude());
            }
            if (complaintDetails.getLongitude() != null) {
                complaint.setLongitude(complaintDetails.getLongitude());
            }
            if (complaintDetails.getPhotoUrl() != null) {
                complaint.setPhotoUrl(complaintDetails.getPhotoUrl());
            }
            if (complaintDetails.getRoutedAuthority() != null) {
                complaint.setRoutedAuthority(complaintDetails.getRoutedAuthority());
            }
            if (complaintDetails.getAiSummary() != null) {
                complaint.setAiSummary(complaintDetails.getAiSummary());
            }
            if (complaintDetails.getPriority() != null) {
                complaint.setPriority(complaintDetails.getPriority());
            }
            if (complaintDetails.getStatus() != null) {
                ComplaintStatus newStatus = complaintDetails.getStatus();
                complaint.setStatus(newStatus);
                // Set resolvedAt when status changes to RESOLVED
                if (newStatus == ComplaintStatus.RESOLVED && complaint.getResolvedAt() == null) {
                    complaint.setResolvedAt(LocalDateTime.now());
                }
            }
            if (complaintDetails.getEscalated() != null) {
                complaint.setEscalated(complaintDetails.getEscalated());
            }
            if (complaintDetails.getResolutionPhotoUrl() != null) {
                complaint.setResolutionPhotoUrl(complaintDetails.getResolutionPhotoUrl());
            }
            if (complaintDetails.getResolutionNote() != null) {
                complaint.setResolutionNote(complaintDetails.getResolutionNote());
            }
            if (complaintDetails.getAreaReferencePhotoUrl() != null) {
                complaint.setAreaReferencePhotoUrl(complaintDetails.getAreaReferencePhotoUrl());
            }
            if (complaintDetails.getAreaReferenceCapturedAt() != null) {
                complaint.setAreaReferenceCapturedAt(complaintDetails.getAreaReferenceCapturedAt());
            }
            if (complaintDetails.getResolutionVerified() != null) {
                complaint.setResolutionVerified(complaintDetails.getResolutionVerified());
            }
            if (complaintDetails.getResolutionVerificationNote() != null) {
                complaint.setResolutionVerificationNote(complaintDetails.getResolutionVerificationNote());
            }
            Complaint saved = complaintRepository.save(complaint);

            if (saved.getStatus() == ComplaintStatus.RESOLVED) {
                try {
                    notificationService.sendResolutionEmail(saved);
                } catch (Exception e) {
                    log.warn("Failed to send resolution email: {}", e.getMessage());
                }
            }
            return Optional.of(saved);
        }
        return Optional.empty();
    }

    /**
     * Update complaint status
     */
    public Optional<Complaint> updateComplaintStatus(Long id, String status) {
        Optional<Complaint> existingComplaint = complaintRepository.findById(id);
        if (existingComplaint.isPresent()) {
            Complaint complaint = existingComplaint.get();
            try {
                ComplaintStatus newStatus = ComplaintStatus.valueOf(status);
                complaint.setStatus(newStatus);
                if (newStatus == ComplaintStatus.RESOLVED && complaint.getResolvedAt() == null) {
                    complaint.setResolvedAt(LocalDateTime.now());
                }
                Complaint saved = complaintRepository.save(complaint);
                if (newStatus == ComplaintStatus.RESOLVED) {
                    try {
                        notificationService.sendResolutionEmail(saved);
                    } catch (Exception e) {
                        log.warn("Failed to send resolution email: {}", e.getMessage());
                    }
                }
                return Optional.of(saved);
            } catch (IllegalArgumentException e) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    /**
     * Delete a complaint by ID
     */
    public boolean deleteComplaint(Long id) {
        if (complaintRepository.existsById(id)) {
            complaintRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Get dashboard statistics
     */
    public Map<String, Object> getDashboardStats() {
        List<Complaint> all = complaintRepository.findAll();
        long total = all.size();
        long resolved = all.stream().filter(c -> c.getStatus() == ComplaintStatus.RESOLVED).count();
        long pending = all.stream().filter(c -> c.getStatus() == ComplaintStatus.OPEN || c.getStatus() == ComplaintStatus.IN_PROGRESS).count();
        long escalated = all.stream().filter(c -> Boolean.TRUE.equals(c.getEscalated())).count();

        // Complaints by ward
        Map<String, Map<String, Object>> complaintsByWard = all.stream()
                .collect(Collectors.groupingBy(
                        Complaint::getWard,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    long wardTotal = list.size();
                                    long wardResolved = list.stream().filter(c -> c.getStatus() == ComplaintStatus.RESOLVED).count();
                                    double resolutionRate = wardTotal > 0 ? (wardResolved * 100.0 / wardTotal) : 0.0;
                                    double avgResolutionHours = list.stream()
                                            .filter(c -> c.getStatus() == ComplaintStatus.RESOLVED && c.getResolvedAt() != null)
                                            .mapToDouble(c -> Duration.between(c.getCreatedAt(), c.getResolvedAt()).toHours())
                                            .average().orElse(0.0);
                                    return Map.of(
                                            "total", wardTotal,
                                            "resolved", wardResolved,
                                            "resolutionRate", Math.round(resolutionRate * 10.0) / 10.0,
                                            "avgResolutionTimeHours", Math.round(avgResolutionHours * 10.0) / 10.0
                                    );
                                }
                        )
                ));

        // Complaints by category
        Map<String, Long> complaintsByCategory = all.stream()
                .collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()));

        return Map.of(
                "totalComplaints", total,
                "resolvedCount", resolved,
                "pendingCount", pending,
                "escalatedCount", escalated,
                "complaintsByWard", complaintsByWard,
                "complaintsByCategory", complaintsByCategory
        );
    }

    /**
     * Get safety heatmap data
     * Returns all safety-relevant complaints with riskLevel and timeOfDay
     */
    public List<Map<String, Object>> getSafetyHeatmap() {
        List<Complaint> safetyComplaints = complaintRepository.findAll().stream()
                .filter(c -> "SAFETY".equals(c.getIssueType()))
                .collect(Collectors.toList());

        return safetyComplaints.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("category", c.getCategory());
            map.put("description", c.getDescription());
            map.put("location", c.getLocation());
            map.put("ward", c.getWard());
            map.put("latitude", c.getLatitude());
            map.put("longitude", c.getLongitude());
            map.put("status", c.getStatus());
            map.put("priority", c.getPriority());
            map.put("routedAuthority", c.getRoutedAuthority());
            map.put("createdAt", c.getCreatedAt());
            map.put("escalated", c.getEscalated());
            
            // Calculate risk level based on nearby similar complaints
            String riskLevel = calculateRiskLevel(c, safetyComplaints);
            map.put("riskLevel", riskLevel);
            
            // Determine time of day
            String timeOfDay = getTimeOfDay(c.getCreatedAt());
            map.put("timeOfDay", timeOfDay);
            
            return map;
        }).collect(Collectors.toList());
    }

    /**
     * Calculate risk level based on nearby similar complaints within 200m
     */
    private String calculateRiskLevel(Complaint complaint, List<Complaint> allSafetyComplaints) {
        int nearbyCount = 0;
        
        for (Complaint other : allSafetyComplaints) {
            if (other.getId().equals(complaint.getId())) continue;
            
            double distance = calculateDistance(
                complaint.getLatitude(), complaint.getLongitude(),
                other.getLatitude(), other.getLongitude()
            );
            
            if (distance <= SAFETY_CLUSTER_RADIUS_KM) {
                nearbyCount++;
            }
        }
        
        // Include the complaint itself in count
        int totalCount = nearbyCount + 1;
        
        if (totalCount >= 3) return "HIGH";
        else if (totalCount >= 2) return "MEDIUM";
        else return "LOW";
    }

    /**
     * Get time of day from timestamp
     */
    private String getTimeOfDay(LocalDateTime dateTime) {
        if (dateTime == null) return "UNKNOWN";
        
        int hour = dateTime.getHour();
        if (hour >= 5 && hour < 12) return "MORNING";
        else if (hour >= 12 && hour < 17) return "AFTERNOON";
        else if (hour >= 17 && hour < 21) return "EVENING";
        else return "NIGHT";
    }

    /**
     * Calculate distance between two lat/lng points using Haversine formula
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Check route safety between two points
     * Returns warning if HIGH risk safety incidents are near the path
     */
    public Map<String, Object> checkRouteSafety(double startLat, double startLng, double endLat, double endLng) {
        Map<String, Object> result = new HashMap<>();
        
        List<Complaint> highRiskComplaints = complaintRepository.findAll().stream()
                .filter(c -> "SAFETY".equals(c.getIssueType()))
                .filter(c -> "HIGH".equals(calculateRiskLevel(c, 
                    complaintRepository.findAll().stream()
                        .filter(s -> "SAFETY".equals(s.getIssueType()))
                        .collect(Collectors.toList()))))
                .collect(Collectors.toList());

        List<Map<String, Object>> riskyLocations = new ArrayList<>();
        
        for (Complaint c : highRiskComplaints) {
            // Check if complaint is within ROUTE_CHECK_RADIUS_KM of the straight line path
            double distanceToPath = distanceToLineSegment(
                startLat, startLng, endLat, endLng,
                c.getLatitude(), c.getLongitude()
            );
            
            if (distanceToPath <= ROUTE_CHECK_RADIUS_KM) {
                Map<String, Object> risky = new HashMap<>();
                risky.put("id", c.getId());
                risky.put("category", c.getCategory());
                risky.put("location", c.getLocation());
                risky.put("latitude", c.getLatitude());
                risky.put("longitude", c.getLongitude());
                risky.put("riskLevel", "HIGH");
                risky.put("timeOfDay", getTimeOfDay(c.getCreatedAt()));
                riskyLocations.add(risky);
            }
        }
        
        if (riskyLocations.isEmpty()) {
            result.put("safe", true);
            result.put("message", "Route appears safe - no high-risk safety incidents detected near the path");
        } else {
            result.put("safe", false);
            result.put("message", "This route passes near reported unsafe area(s) - consider alternate route or travel during daytime");
            result.put("riskyLocations", riskyLocations);
        }
        
        return result;
    }

    /**
     * Check route safety along a sequence of real road coordinates (geometry)
     * Returns warning if HIGH risk safety incidents are within ROUTE_CHECK_RADIUS_KM of any road segment
     */
    public Map<String, Object> checkRouteGeometrySafety(List<List<Double>> coordinates) {
        Map<String, Object> result = new HashMap<>();
        if (coordinates == null || coordinates.size() < 2) {
            result.put("safe", true);
            result.put("message", "Route appears safe");
            result.put("riskyLocations", Collections.emptyList());
            return result;
        }

        List<Complaint> highRiskComplaints = complaintRepository.findAll().stream()
                .filter(c -> "SAFETY".equals(c.getIssueType()))
                .filter(c -> "HIGH".equals(calculateRiskLevel(c, 
                    complaintRepository.findAll().stream()
                        .filter(s -> "SAFETY".equals(s.getIssueType()))
                        .collect(Collectors.toList()))))
                .collect(Collectors.toList());

        List<Map<String, Object>> riskyLocations = new ArrayList<>();

        for (Complaint c : highRiskComplaints) {
            double minDistanceToRoute = Double.MAX_VALUE;
            // Check distance to each segment along the road polyline
            for (int i = 0; i < coordinates.size() - 1; i++) {
                List<Double> p1 = coordinates.get(i);
                List<Double> p2 = coordinates.get(i + 1);
                if (p1.size() >= 2 && p2.size() >= 2) {
                    double d = distanceToLineSegment(p1.get(0), p1.get(1), p2.get(0), p2.get(1), c.getLatitude(), c.getLongitude());
                    if (d < minDistanceToRoute) {
                        minDistanceToRoute = d;
                    }
                }
            }

            if (minDistanceToRoute <= ROUTE_CHECK_RADIUS_KM) {
                Map<String, Object> risky = new HashMap<>();
                risky.put("id", c.getId());
                risky.put("category", c.getCategory());
                risky.put("location", c.getLocation());
                risky.put("latitude", c.getLatitude());
                risky.put("longitude", c.getLongitude());
                risky.put("riskLevel", "HIGH");
                risky.put("timeOfDay", getTimeOfDay(c.getCreatedAt()));
                riskyLocations.add(risky);
            }
        }

        if (riskyLocations.isEmpty()) {
            result.put("safe", true);
            result.put("message", "Route is safe - no high-risk safety incidents detected along this road path");
            result.put("riskyLocations", Collections.emptyList());
        } else {
            result.put("safe", false);
            result.put("message", "This route passes near " + riskyLocations.size() + " reported unsafe area(s) - consider alternate route or travel during daytime");
            result.put("riskyLocations", riskyLocations);
        }
        return result;
    }

    /**
     * Calculate distance from a point to a line segment (for route checking)
     */
    private double distanceToLineSegment(double lat1, double lon1, double lat2, double lon2, double latP, double lonP) {
        // Convert to simple Cartesian approximation for short distances
        // Using equirectangular approximation
        double x1 = lon1 * Math.cos(Math.toRadians(lat1));
        double y1 = lat1;
        double x2 = lon2 * Math.cos(Math.toRadians(lat2));
        double y2 = lat2;
        double xP = lonP * Math.cos(Math.toRadians(latP));
        double yP = latP;
        
        double dx = x2 - x1;
        double dy = y2 - y1;
        
        if (dx == 0 && dy == 0) {
            // Start and end are the same point
            return Math.sqrt(Math.pow(xP - x1, 2) + Math.pow(yP - y1, 2)) * 111.32; // Convert to km
        }
        
        double t = ((xP - x1) * dx + (yP - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t)); // Clamp to segment
        
        double closestX = x1 + t * dx;
        double closestY = y1 + t * dy;
        
        double distance = Math.sqrt(Math.pow(xP - closestX, 2) + Math.pow(yP - closestY, 2));
        return distance * 111.32; // Convert degrees to km (approximate)
    }

    /**
     * Scheduled job: Auto-escalate OPEN complaints and dispatch recurring reminders until resolved.
     * Runs every 60 seconds.
     */
    @Scheduled(fixedRate = 60000) // 60 seconds
    @Transactional
    public void autoEscalateOpenComplaints() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime escalationThreshold = now.minusMinutes(escalationThresholdMinutes);
            List<Complaint> allUnresolved = complaintRepository.findAll().stream()
                    .filter(c -> c.getStatus() == ComplaintStatus.OPEN || c.getStatus() == ComplaintStatus.IN_PROGRESS)
                    .toList();

            for (Complaint complaint : allUnresolved) {
                long minutesUnresolved = Duration.between(complaint.getCreatedAt(), now).toMinutes();

                // 1. Auto-escalate OPEN complaints past the SLA threshold
                if (complaint.getStatus() == ComplaintStatus.OPEN && !Boolean.TRUE.equals(complaint.getEscalated()) && complaint.getCreatedAt().isBefore(escalationThreshold)) {
                    complaint.setEscalated(true);
                    log.warn("Auto-escalated complaint ID {} (OPEN for > {} minutes). Authority: {}",
                            complaint.getId(), escalationThresholdMinutes, complaint.getRoutedAuthority());
                }

                // 2. Periodic reminder to both citizen and authority every 2 minutes while unresolved
                LocalDateTime lastReminder = complaint.getLastReminderSentAt();
                boolean shouldSendReminder = (lastReminder == null && minutesUnresolved >= 1)
                        || (lastReminder != null && Duration.between(lastReminder, now).toMinutes() >= 2);

                if (shouldSendReminder) {
                    try {
                        notificationService.sendUnresolvedReminderEmail(complaint, Math.max(1, minutesUnresolved));
                        complaint.setLastReminderSentAt(now);
                        complaint.setReminderCount(complaint.getReminderCount() + 1);
                    } catch (Exception e) {
                        log.warn("Failed to dispatch unresolved reminder for ticket #{}: {}", complaint.getId(), e.getMessage());
                    }
                }

                complaintRepository.save(complaint);
            }

            if (!allUnresolved.isEmpty()) {
                log.info("Auto-monitor evaluated {} active unresolved complaints", allUnresolved.size());
            }
        } catch (Exception e) {
            log.error("Auto-escalation and reminder job failed: {}", e.getMessage());
        }
    }

    /**
     * Seed sample complaints on startup if database is empty
     */
    @Override
    @Transactional
    public void run(String... args) {
        if (complaintRepository.count() == 0) {
            log.info("Database empty - seeding sample complaints...");
            seedSampleComplaints();
        }
    }

    private void seedSampleComplaints() {
        var samples = List.of(
                // Ward 1
                new SampleComplaint("Streetlight", "Streetlight not working on Main Road near bus stop", "Main Road, Sector 1", "Ward 1", 28.6139, 77.2090, ComplaintStatus.OPEN),
                new SampleComplaint("Drainage", "Waterlogging after heavy rain near market", "Market Area", "Ward 1", 28.6150, 77.2100, ComplaintStatus.IN_PROGRESS),
                new SampleComplaint("Road Damage", "Large pothole on Highway 48 causing traffic", "Highway 48", "Ward 1", 28.6160, 77.2110, ComplaintStatus.RESOLVED),
                // Ward 2
                new SampleComplaint("Illegal Dumping", "Construction waste dumped in empty plot", "Park Lane", "Ward 2", 28.6200, 77.2150, ComplaintStatus.OPEN),
                new SampleComplaint("Unsafe Area", "Poor lighting and suspicious activity near school", "School Road", "Ward 2", 28.6210, 77.2160, ComplaintStatus.IN_PROGRESS),
                new SampleComplaint("Streetlight", "Flickering streetlights on residential street", "Garden Street", "Ward 2", 28.6220, 77.2170, ComplaintStatus.RESOLVED),
                // Ward 3
                new SampleComplaint("Drainage", "Sewage overflow near community center", "Community Center Road", "Ward 3", 28.6250, 77.2200, ComplaintStatus.OPEN),
                new SampleComplaint("Encroachment", "Shop extended onto footpath blocking pedestrians", "Mall Road", "Ward 3", 28.6260, 77.2210, ComplaintStatus.RESOLVED),
                new SampleComplaint("Road Damage", "Cracked road surface after water pipe repair", "Station Road", "Ward 3", 28.6270, 77.2220, ComplaintStatus.IN_PROGRESS),
                // Additional for variety
                new SampleComplaint("Illegal Dumping", "Household garbage dumped near park entrance", "Park Gate", "Ward 1", 28.6180, 77.2120, ComplaintStatus.ESCALATED)
        );

        for (SampleComplaint s : samples) {
            Complaint c = new Complaint(s.category(), s.description(), s.location(), s.ward(), s.latitude(), s.longitude());
            c.setStatus(s.status());
            c.setEscalated(s.status() == ComplaintStatus.ESCALATED);
            
            // Assign default routing & summary for seeded demo complaints
            switch (s.category()) {
                case "Streetlight" -> {
                    c.setRoutedAuthority("Electricity Department");
                    c.setPriority(ComplaintPriority.MEDIUM);
                }
                case "Drainage" -> {
                    c.setRoutedAuthority("Water Board");
                    c.setPriority(ComplaintPriority.MEDIUM);
                }
                case "Road Damage", "Encroachment" -> {
                    c.setRoutedAuthority("Municipal Road Department");
                    c.setPriority(ComplaintPriority.MEDIUM);
                }
                case "Illegal Dumping" -> {
                    c.setRoutedAuthority("Sanitation Department");
                    c.setPriority(ComplaintPriority.LOW);
                }
                case "Unsafe Area" -> {
                    c.setRoutedAuthority("Local Police / Women Safety Cell");
                    c.setPriority(ComplaintPriority.HIGH);
                }
                default -> {
                    c.setRoutedAuthority("Municipal Corporation");
                    c.setPriority(ComplaintPriority.LOW);
                }
            }
            c.setAiSummary("Auto-classified civic issue in " + s.ward() + ": " + s.description());
            setIssueType(c); // Set issueType for seeded data
            if (s.status() == ComplaintStatus.RESOLVED) {
                c.setResolvedAt(c.getCreatedAt().plusHours(2 + (long)(Math.random() * 24)));
            }
            complaintRepository.save(c);
        }
        log.info("Seeded {} sample complaints across 3 wards", samples.size());
    }

    private record SampleComplaint(String category, String description, String location, String ward, double latitude, double longitude, ComplaintStatus status) {}
}