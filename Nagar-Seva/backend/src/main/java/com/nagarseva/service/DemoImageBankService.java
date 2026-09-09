package com.nagarseva.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;

/**
 * Service providing reference street and area images from a bundled demo asset bank.
 * Designed to match the API contract of future live map imagery providers (e.g. Mapillary).
 */
@Service
public class DemoImageBankService implements AreaReferenceService {

    private static final Logger log = LoggerFactory.getLogger(DemoImageBankService.class);

    private final ObjectMapper objectMapper;
    private List<DemoLocationEntry> locations = new ArrayList<>();

    public record DemoLocationEntry(
            double lat,
            double lng,
            String areaReference,
            String sampleGrievance,
            String sampleResolved,
            String capturedAt
    ) {}

    public DemoImageBankService() {
        this.objectMapper = new ObjectMapper();
    }

    public DemoImageBankService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @PostConstruct
    public void init() {
        loadDemoLocations("demo-assets/demo-locations.json");
    }

    public synchronized void loadDemoLocations(String resourcePath) {
        try {
            ClassPathResource resource = new ClassPathResource(resourcePath);
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    List<DemoLocationEntry> parsed = objectMapper.readValue(is, new TypeReference<List<DemoLocationEntry>>() {});
                    if (parsed != null) {
                        this.locations = new ArrayList<>(parsed);
                        log.info("Loaded {} demo locations from {}", locations.size(), resourcePath);
                        return;
                    }
                }
            }
            log.warn("Demo locations resource '{}' not found or empty on classpath", resourcePath);
        } catch (Exception e) {
            log.error("Failed to load demo locations from '{}': {}", resourcePath, e.getMessage(), e);
        }
    }

    public synchronized void setLocations(List<DemoLocationEntry> locations) {
        this.locations = locations != null ? new ArrayList<>(locations) : new ArrayList<>();
    }

    public synchronized List<DemoLocationEntry> getLocations() {
        return Collections.unmodifiableList(locations);
    }

    @Override
    public Optional<AreaReferenceImage> findNearestReference(double lat, double lng) {
        return findNearest(lat, lng, Double.MAX_VALUE);
    }

    @Override
    public Optional<AreaReferenceImage> findNearestImage(double lat, double lng, double radiusMeters) {
        return findNearest(lat, lng, radiusMeters);
    }

    private synchronized Optional<AreaReferenceImage> findNearest(double lat, double lng, double maxDistanceMeters) {
        if (locations == null || locations.isEmpty()) {
            return Optional.empty();
        }

        DemoLocationEntry bestMatch = null;
        double minDistance = Double.MAX_VALUE;

        for (DemoLocationEntry entry : locations) {
            double dist = haversineDistanceMeters(lat, lng, entry.lat(), entry.lng());
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = entry;
            }
        }

        if (bestMatch != null && minDistance <= maxDistanceMeters) {
            LocalDate date = null;
            if (bestMatch.capturedAt() != null && !bestMatch.capturedAt().isBlank()) {
                try {
                    date = LocalDate.parse(bestMatch.capturedAt().trim());
                } catch (Exception ignored) {
                }
            }

            String rawPath = bestMatch.areaReference();
            String normalizedUrl = normalizeAssetUrl(rawPath);

            return Optional.of(new AreaReferenceImage(
                    normalizedUrl,
                    date,
                    bestMatch.lat(),
                    bestMatch.lng()
            ));
        }

        return Optional.empty();
    }

    private String normalizeAssetUrl(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
            return path;
        }
        if (path.startsWith("/demo-assets/")) {
            return path;
        }
        if (path.startsWith("demo-assets/")) {
            return "/" + path;
        }
        if (path.startsWith("/")) {
            return "/demo-assets" + path;
        }
        return "/demo-assets/" + path;
    }

    /**
     * Compute Great Circle distance between two geo coordinates in meters.
     */
    public static double haversineDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }
}
