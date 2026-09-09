package com.nagarseva.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Directory;
import com.drew.metadata.Metadata;
import com.drew.metadata.Tag;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import com.drew.metadata.jpeg.JpegDirectory;
import com.drew.metadata.png.PngDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.Base64;

/**
 * Production-grade photo forensics service for detecting tampering, validating EXIF metadata,
 * and ensuring photo authenticity for civic grievance reporting.
 */
@Service
public class PhotoForensicsService {

    private static final Logger log = LoggerFactory.getLogger(PhotoForensicsService.class);

    // Maximum allowed age of photo in days (7 days for civic issues)
    private static final int MAX_PHOTO_AGE_DAYS = 7;
    // GPS tolerance in degrees (~100 meters at equator)
    private static final double GPS_TOLERANCE_DEGREES = 0.001;
    // Minimum image dimensions
    private static final int MIN_IMAGE_DIMENSION = 100;
    // Maximum image dimensions
    private static final int MAX_IMAGE_DIMENSION = 8000;

    public record PhotoForensicsResult(
            boolean isOriginal,
            boolean hasValidExif,
            boolean gpsMatchesLocation,
            boolean timestampRecent,
            boolean dimensionsValid,
            String cameraMakeModel,
            String manipulationIndicators,
            Double extractedLatitude,
            Double extractedLongitude,
            LocalDateTime extractedDateTime,
            int imageWidth,
            int imageHeight,
            long fileSizeBytes,
            String mimeType
    ) {}

    public record ValidationResult(
            boolean valid,
            String errorCode,
            String errorMessage,
            PhotoForensicsResult forensics
    ) {}

    /**
     * Comprehensive photo validation for citizen complaint submission.
     * Checks: file integrity, dimensions, EXIF authenticity, GPS match, timestamp recency.
     */
    public ValidationResult validateComplaintPhoto(String base64PhotoData, Double reportedLat, Double reportedLng) {
        try {
            byte[] imageBytes = decodeBase64Image(base64PhotoData);
            PhotoForensicsResult forensics = analyzeImage(imageBytes, reportedLat, reportedLng);

            // Validation rules for complaint photos
            List<String> violations = new ArrayList<>();

            if (!forensics.dimensionsValid) {
                violations.add("INVALID_DIMENSIONS: Image dimensions must be between " +
                        MIN_IMAGE_DIMENSION + "x" + MIN_IMAGE_DIMENSION + " and " +
                        MAX_IMAGE_DIMENSION + "x" + MAX_IMAGE_DIMENSION);
            }

            if (forensics.fileSizeBytes > 2 * 1024 * 1024) {
                violations.add("FILE_TOO_LARGE: Photo exceeds 2MB limit");
            }

            if (!forensics.hasValidExif) {
                violations.add("MISSING_EXIF: Photo must contain camera metadata (EXIF). Screenshots and edited images are not accepted.");
            }

            if (!forensics.isOriginal) {
                violations.add("POSSIBLE_TAMPERING: " + forensics.manipulationIndicators);
            }

            if (reportedLat != null && reportedLng != null && !forensics.gpsMatchesLocation) {
                violations.add("GPS_MISMATCH: Photo GPS location does not match reported location (tolerance: ~100m)");
            }

            if (!forensics.timestampRecent) {
                violations.add("PHOTO_TOO_OLD: Photo must be taken within " + MAX_PHOTO_AGE_DAYS + " days");
            }

            if (violations.isEmpty()) {
                return new ValidationResult(true, null, null, forensics);
            } else {
                return new ValidationResult(false, "PHOTO_VALIDATION_FAILED",
                        String.join("; ", violations), forensics);
            }

        } catch (Exception e) {
            log.error("Photo validation failed: {}", e.getMessage(), e);
            return new ValidationResult(false, "VALIDATION_ERROR",
                    "Failed to validate photo: " + e.getMessage(), null);
        }
    }

    /**
     * Validates resolution photo from municipal officer.
     * Stricter rules: must have GPS matching complaint location, timestamp AFTER complaint creation.
     */
    public ValidationResult validateResolutionPhoto(String base64PhotoData,
                                                     Double complaintLat, Double complaintLng,
                                                     LocalDateTime complaintCreatedAt) {
        try {
            byte[] imageBytes = decodeBase64Image(base64PhotoData);
            PhotoForensicsResult forensics = analyzeImage(imageBytes, complaintLat, complaintLng);

            List<String> violations = new ArrayList<>();

            if (!forensics.dimensionsValid) {
                violations.add("INVALID_DIMENSIONS");
            }

            if (forensics.fileSizeBytes > 5 * 1024 * 1024) { // 5MB for resolution photos
                violations.add("FILE_TOO_LARGE: Resolution photo exceeds 5MB limit");
            }

            if (!forensics.hasValidExif) {
                violations.add("MISSING_EXIF: Resolution photo must contain camera metadata (EXIF). Screenshots not accepted.");
            }

            if (!forensics.isOriginal) {
                violations.add("POSSIBLE_TAMPERING: " + forensics.manipulationIndicators);
            }

            if (!forensics.gpsMatchesLocation) {
                violations.add("GPS_MISMATCH: Resolution photo must be taken at the complaint location");
            }

            if (forensics.extractedDateTime != null && complaintCreatedAt != null) {
                if (forensics.extractedDateTime.isBefore(complaintCreatedAt.minusMinutes(5))) {
                    violations.add("TIMESTAMP_VIOLATION: Resolution photo must be taken AFTER complaint was created");
                }
            } else if (forensics.extractedDateTime == null) {
                violations.add("MISSING_TIMESTAMP: Resolution photo must have valid EXIF timestamp");
            }

            if (violations.isEmpty()) {
                return new ValidationResult(true, null, null, forensics);
            } else {
                return new ValidationResult(false, "RESOLUTION_PHOTO_VALIDATION_FAILED",
                        String.join("; ", violations), forensics);
            }

        } catch (Exception e) {
            log.error("Resolution photo validation failed: {}", e.getMessage(), e);
            return new ValidationResult(false, "VALIDATION_ERROR",
                    "Failed to validate resolution photo: " + e.getMessage(), null);
        }
    }

    /**
     * Core image analysis: extracts metadata, detects manipulation, validates EXIF.
     */
    private PhotoForensicsResult analyzeImage(byte[] imageBytes, Double reportedLat, Double reportedLng) {
        String mimeType = detectMimeType(imageBytes);
        int fileSizeBytes = imageBytes.length;

        // Decode image for dimension check
        BufferedImage image = null;
        int imageWidth = 0;
        int imageHeight = 0;
        try (InputStream is = new ByteArrayInputStream(imageBytes)) {
            image = ImageIO.read(is);
            if (image != null) {
                imageWidth = image.getWidth();
                imageHeight = image.getHeight();
            }
        } catch (IOException e) {
            log.warn("Could not read image dimensions: {}", e.getMessage());
        }

        boolean dimensionsValid = imageWidth >= MIN_IMAGE_DIMENSION &&
                imageHeight >= MIN_IMAGE_DIMENSION &&
                imageWidth <= MAX_IMAGE_DIMENSION &&
                imageHeight <= MAX_IMAGE_DIMENSION;

        // Extract EXIF metadata
        Metadata metadata = null;
        try (InputStream is = new ByteArrayInputStream(imageBytes)) {
            metadata = ImageMetadataReader.readMetadata(is);
        } catch (ImageProcessingException | IOException e) {
            log.warn("Could not read EXIF metadata: {}", e.getMessage());
        }

        boolean hasValidExif = metadata != null && hasMeaningfulExif(metadata);
        String cameraMakeModel = extractCameraInfo(metadata);
        String manipulationIndicators = detectManipulation(metadata, imageBytes, mimeType);
        boolean isOriginal = manipulationIndicators.isEmpty() || manipulationIndicators.equals("No manipulation indicators detected");

        // Extract GPS coordinates
        Double extractedLat = null;
        Double extractedLng = null;
        if (metadata != null) {
            GpsDirectory gpsDir = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDir != null) {
                extractedLat = gpsDir.getGeoLocation() != null ? gpsDir.getGeoLocation().getLatitude() : null;
                extractedLng = gpsDir.getGeoLocation() != null ? gpsDir.getGeoLocation().getLongitude() : null;
            }
        }

        // Extract timestamp
        LocalDateTime extractedDateTime = extractDateTime(metadata);

        // Validate GPS match
        boolean gpsMatchesLocation = false;
        if (reportedLat != null && reportedLng != null && extractedLat != null && extractedLng != null) {
            double latDiff = Math.abs(reportedLat - extractedLat);
            double lngDiff = Math.abs(reportedLng - extractedLng);
            gpsMatchesLocation = latDiff <= GPS_TOLERANCE_DEGREES && lngDiff <= GPS_TOLERANCE_DEGREES;
        }

        // Validate timestamp recency
        boolean timestampRecent = false;
        if (extractedDateTime != null) {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            timestampRecent = !extractedDateTime.isBefore(now.minusDays(MAX_PHOTO_AGE_DAYS));
        }

        return new PhotoForensicsResult(
                isOriginal,
                hasValidExif,
                gpsMatchesLocation,
                timestampRecent,
                dimensionsValid,
                cameraMakeModel,
                manipulationIndicators,
                extractedLat,
                extractedLng,
                extractedDateTime,
                imageWidth,
                imageHeight,
                fileSizeBytes,
                mimeType
        );
    }

    private byte[] decodeBase64Image(String base64Data) {
        if (base64Data == null || base64Data.isBlank()) {
            throw new IllegalArgumentException("Photo data is empty");
        }

        String cleanBase64 = base64Data;
        if (cleanBase64.contains(",")) {
            cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(',') + 1);
        }

        return Base64.getDecoder().decode(cleanBase64);
    }

    private String detectMimeType(byte[] bytes) {
        if (bytes.length >= 2) {
            // JPEG: FF D8 FF
            if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8) return "image/jpeg";
            // PNG: 89 50 4E 47
            if (bytes.length >= 4 && bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 &&
                    bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47) return "image/png";
            // WebP: RIFF....WEBP
            if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F') return "image/webp";
        }
        return "image/jpeg"; // default
    }

    private boolean hasMeaningfulExif(Metadata metadata) {
        if (metadata == null) return false;

        // Check for essential EXIF directories
        boolean hasExifIFD0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class) != null;
        boolean hasExifSubIFD = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class) != null;
        boolean hasGps = metadata.getFirstDirectoryOfType(GpsDirectory.class) != null;

        // Also check for JPEG/PNG specific directories
        boolean hasJpeg = metadata.getFirstDirectoryOfType(JpegDirectory.class) != null;
        boolean hasPng = metadata.getFirstDirectoryOfType(PngDirectory.class) != null;

        return (hasExifIFD0 || hasExifSubIFD || hasGps || hasJpeg || hasPng);
    }

    private String extractCameraInfo(Metadata metadata) {
        if (metadata == null) return "Unknown";

        ExifIFD0Directory ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
        if (ifd0 != null) {
            String make = ifd0.getString(ExifIFD0Directory.TAG_MAKE);
            String model = ifd0.getString(ExifIFD0Directory.TAG_MODEL);
            if (make != null || model != null) {
                return (make != null ? make : "") + " " + (model != null ? model : "");
            }
        }
        return "Unknown";
    }

    private String detectManipulation(Metadata metadata, byte[] imageBytes, String mimeType) {
        List<String> indicators = new ArrayList<>();

        if (metadata == null) {
            indicators.add("No EXIF metadata found (possible screenshot or stripped metadata)");
            return String.join("; ", indicators);
        }

        // Check for software tags indicating editing
        ExifIFD0Directory ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
        if (ifd0 != null) {
            String software = ifd0.getString(ExifIFD0Directory.TAG_SOFTWARE);
            if (software != null) {
                String lowerSoftware = software.toLowerCase();
                if (lowerSoftware.contains("photoshop") || lowerSoftware.contains("gimp") ||
                        lowerSoftware.contains("lightroom") || lowerSoftware.contains("snapseed") ||
                        lowerSoftware.contains("editor") || lowerSoftware.contains("paint") ||
                        lowerSoftware.contains("canva") || lowerSoftware.contains("pixlr")) {
                    indicators.add("Edited with software: " + software);
                }
            }

            // Check for missing critical tags that cameras always write
            String make = ifd0.getString(ExifIFD0Directory.TAG_MAKE);
            String model = ifd0.getString(ExifIFD0Directory.TAG_MODEL);
            if (make == null && model == null) {
                indicators.add("Missing camera make/model (possible metadata strip)");
            }
        }

        // Check for ExifSubIFD (contains exposure, aperture, ISO - camera always writes these)
        ExifSubIFDDirectory subIfd = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
        if (subIfd == null) {
            indicators.add("Missing ExifSubIFD directory (no camera exposure data)");
        } else {
            // Check for key exposure tags
            if (subIfd.getObject(ExifSubIFDDirectory.TAG_EXPOSURE_TIME) == null &&
                    subIfd.getObject(ExifSubIFDDirectory.TAG_FNUMBER) == null &&
                    subIfd.getObject(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT) == null) {
                indicators.add("Missing exposure parameters (aperture, shutter speed, ISO)");
            }
        }

        // Check for GPS data (most smartphones embed GPS by default)
        GpsDirectory gps = metadata.getFirstDirectoryOfType(GpsDirectory.class);
        if (gps == null || gps.getGeoLocation() == null) {
            indicators.add("No GPS coordinates in EXIF (location services may have been disabled)");
        }

        // Check for screenshot indicators
        if (metadata.getFirstDirectoryOfType(PngDirectory.class) != null) {
            // PNGs from screenshots often lack EXIF
            if (!hasMeaningfulExif(metadata)) {
                indicators.add("PNG without EXIF (likely screenshot)");
            }
        }

        // Heuristic: check file size vs dimensions ratio for over-compression
        if (imageBytes.length > 0 && imageBytes.length < 50000) { // < 50KB for a photo is suspicious
            indicators.add("Unusually small file size for photo dimensions (possible heavy compression/resize)");
        }

        return indicators.isEmpty() ? "No manipulation indicators detected" : String.join("; ", indicators);
    }

    private LocalDateTime extractDateTime(Metadata metadata) {
        if (metadata == null) return null;

        // Try ExifSubIFD first (most accurate - DateTimeOriginal)
        ExifSubIFDDirectory subIfd = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
        if (subIfd != null) {
            Date date = subIfd.getDate(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
            if (date != null) return date.toInstant().atOffset(ZoneOffset.UTC).toLocalDateTime();

            date = subIfd.getDate(ExifSubIFDDirectory.TAG_DATETIME_DIGITIZED);
            if (date != null) return date.toInstant().atOffset(ZoneOffset.UTC).toLocalDateTime();
        }

        // Fallback to IFD0 DateTime
        ExifIFD0Directory ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
        if (ifd0 != null) {
            Date date = ifd0.getDate(ExifIFD0Directory.TAG_DATETIME);
            if (date != null) return date.toInstant().atOffset(ZoneOffset.UTC).toLocalDateTime();
        }

        return null;
    }

    /**
     * Validates a MultipartFile directly (for multipart uploads).
     */
    public ValidationResult validateMultipartFile(MultipartFile file, Double reportedLat, Double reportedLng) {
        if (file == null || file.isEmpty()) {
            return new ValidationResult(false, "EMPTY_FILE", "No file provided", null);
        }

        try {
            byte[] bytes = file.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            return validateComplaintPhoto(base64, reportedLat, reportedLng);
        } catch (IOException e) {
            return new ValidationResult(false, "READ_ERROR", "Failed to read file: " + e.getMessage(), null);
        }
    }
}