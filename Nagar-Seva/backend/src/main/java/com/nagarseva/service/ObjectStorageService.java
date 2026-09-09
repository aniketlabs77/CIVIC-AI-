package com.nagarseva.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;
import java.util.ArrayList;

/**
 * Production-grade object storage service for S3/MinIO/GCS compatibility.
 * Handles direct browser-to-storage uploads via presigned URLs (bypasses backend).
 */
@Service
public class ObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(ObjectStorageService.class);

    @Value("${app.storage.s3.endpoint:}")
    private String endpoint;

    @Value("${app.storage.s3.region:us-east-1}")
    private String region;

    @Value("${app.storage.s3.bucket:nagarseva}")
    private String bucket;

    @Value("${app.storage.s3.access-key:}")
    private String accessKey;

    @Value("${app.storage.s3.secret-key:}")
    private String secretKey;

    @Value("${app.storage.s3.enabled:false}")
    private boolean enabled;

    @Value("${app.storage.s3.path-style-access:true}")
    private boolean pathStyleAccess;

    private S3Client s3Client;
    private S3Presigner presigner;

    public record UploadResult(
            String objectKey,
            String publicUrl,
            String presignedGetUrl,
            long sizeBytes,
            String contentType
    ) {}

    public record PresignedUrlResult(
            String uploadUrl,
            String objectKey,
            String publicUrl,
            Duration expiresIn,
            Map<String, String> requiredHeaders
    ) {}

    public record DeleteResult(
            boolean success,
            String objectKey,
            String error
    ) {}

    /**
     * Initialize S3 client lazily to allow configuration via environment variables.
     */
    private synchronized S3Client getS3Client() {
        if (s3Client == null && enabled) {
            software.amazon.awssdk.services.s3.S3ClientBuilder builder = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)));

            if (endpoint != null && !endpoint.isBlank()) {
                builder.endpointOverride(java.net.URI.create(endpoint));
            }

            // For MinIO and S3-compatible services
            if (pathStyleAccess) {
                builder.forcePathStyle(true);
            }

            s3Client = builder.build();
            log.info("Initialized S3 client for bucket: {} at endpoint: {}", bucket, endpoint != null ? endpoint : "AWS default");
        }
        return s3Client;
    }

    private synchronized S3Presigner getPresigner() {
        if (presigner == null && enabled) {
            S3Presigner.Builder builder = S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)));

            if (endpoint != null && !endpoint.isBlank()) {
                builder.endpointOverride(java.net.URI.create(endpoint));
            }

            presigner = builder.build();
        }
        return presigner;
    }

    /**
     * Generate a presigned PUT URL for direct browser upload.
     * Frontend calls this, then uploads directly to S3/MinIO.
     */
    public PresignedUrlResult generatePresignedUploadUrl(String contentType, String folder, String fileName) {
        if (!enabled) {
            throw new IllegalStateException("Object storage not configured. Set app.storage.s3.enabled=true");
        }

        String objectKey = buildObjectKey(folder, fileName);
        String publicUrl = buildPublicUrl(objectKey);

        S3Presigner presigner = getPresigner();
        if (presigner == null) {
            throw new IllegalStateException("Failed to initialize S3 presigner");
        }

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putRequest)
                .build();

        URL uploadUrl = presigner.presignPutObject(presignRequest).url();

        Map<String, String> requiredHeaders = new java.util.HashMap<>();
        requiredHeaders.put("Content-Type", contentType);

        return new PresignedUrlResult(
                uploadUrl.toString(),
                objectKey,
                publicUrl,
                Duration.ofMinutes(15),
                requiredHeaders
        );
    }

    /**
     * Generate a presigned GET URL for temporary access to private objects.
     */
    public String generatePresignedGetUrl(String objectKey, Duration ttl) {
        if (!enabled) {
            return buildPublicUrl(objectKey); // fallback to public URL if not configured
        }

        S3Presigner presigner = getPresigner();
        if (presigner == null) {
            return buildPublicUrl(objectKey);
        }

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(getRequest)
                .build();

        return presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Upload bytes directly (server-side upload for small files or internal use).
     */
    public UploadResult uploadBytes(byte[] data, String contentType, String folder, String fileName) {
        if (!enabled) {
            throw new IllegalStateException("Object storage not configured");
        }

        String objectKey = buildObjectKey(folder, fileName);
        String publicUrl = buildPublicUrl(objectKey);

        S3Client client = getS3Client();
        if (client == null) {
            throw new IllegalStateException("Failed to initialize S3 client");
        }

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .contentLength((long) data.length)
                .build();

        client.putObject(request, RequestBody.fromBytes(data));

        log.info("Uploaded object: {} ({} bytes)", objectKey, data.length);

        return new UploadResult(objectKey, publicUrl, generatePresignedGetUrl(objectKey, Duration.ofHours(1)), data.length, contentType);
    }

    /**
     * Upload a MultipartFile (server-side).
     */
    public UploadResult uploadFile(MultipartFile file, String folder) {
        if (!enabled) {
            throw new IllegalStateException("Object storage not configured");
        }

        try {
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
            String extension = "";
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = originalFilename.substring(dotIndex);
            }
            String fileName = UUID.randomUUID().toString() + extension;

            return uploadBytes(file.getBytes(), file.getContentType(), folder, fileName);
        } catch (Exception e) {
            log.error("File upload failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    /**
     * Upload base64 encoded image (for migration from base64-in-DB).
     */
    public UploadResult uploadBase64Image(String base64Data, String folder, String fileName) {
        byte[] data = decodeBase64Image(base64Data);
        String contentType = detectMimeType(data);
        return uploadBytes(data, contentType, folder, fileName);
    }

    /**
     * Delete an object.
     */
    public DeleteResult deleteObject(String objectKey) {
        if (!enabled) {
            return new DeleteResult(false, objectKey, "Object storage not configured");
        }

        try {
            S3Client client = getS3Client();
            if (client == null) {
                return new DeleteResult(false, objectKey, "S3 client not initialized");
            }

            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .build();

            client.deleteObject(request);
            log.info("Deleted object: {}", objectKey);
            return new DeleteResult(true, objectKey, null);
        } catch (S3Exception e) {
            log.error("Delete failed for {}: {}", objectKey, e.getMessage());
            return new DeleteResult(false, objectKey, e.getMessage());
        }
    }

    /**
     * Check if object exists.
     */
    public boolean objectExists(String objectKey) {
        if (!enabled) return false;

        try {
            S3Client client = getS3Client();
            if (client == null) return false;

            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .build();

            client.headObject(request);
            return true;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) return false;
            log.warn("Error checking object existence: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Get object metadata.
     */
    public Map<String, String> getObjectMetadata(String objectKey) {
        Map<String, String> metadata = new java.util.HashMap<>();
        if (!enabled) return metadata;

        try {
            S3Client client = getS3Client();
            if (client == null) return metadata;

            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .build();

            HeadObjectResponse response = client.headObject(request);
            metadata.put("contentType", response.contentType());
            metadata.put("contentLength", String.valueOf(response.contentLength()));
            metadata.put("lastModified", response.lastModified().toString());
            metadata.put("etag", response.eTag());
            response.metadata().forEach(metadata::put);
        } catch (S3Exception e) {
            log.warn("Error getting metadata for {}: {}", objectKey, e.getMessage());
        }
        return metadata;
    }

    /**
     * List objects in a folder/prefix.
     */
    public List<String> listObjects(String prefix) {
        List<String> keys = new java.util.ArrayList<>();
        if (!enabled) return keys;

        try {
            S3Client client = getS3Client();
            if (client == null) return keys;

            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response response = client.listObjectsV2(request);
            for (S3Object obj : response.contents()) {
                keys.add(obj.key());
            }
        } catch (S3Exception e) {
            log.warn("Error listing objects with prefix {}: {}", prefix, e.getMessage());
        }
        return keys;
    }

    private String buildObjectKey(String folder, String fileName) {
        String cleanFolder = folder != null ? folder.trim().replaceAll("^/+|/+$", "") : "uploads";
        String cleanFileName = fileName != null ? fileName.trim() : UUID.randomUUID().toString();
        return cleanFolder + "/" + cleanFileName;
    }

    private String buildPublicUrl(String objectKey) {
        if (endpoint != null && !endpoint.isBlank()) {
            // MinIO / custom endpoint
            String cleanEndpoint = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
            return cleanEndpoint + "/" + bucket + "/" + objectKey;
        } else {
            // AWS S3 default
            return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + objectKey;
        }
    }

    private byte[] decodeBase64Image(String base64Data) {
        if (base64Data == null || base64Data.isBlank()) {
            throw new IllegalArgumentException("Base64 data is empty");
        }
        String cleanBase64 = base64Data;
        if (cleanBase64.contains(",")) {
            cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(',') + 1);
        }
        return Base64.getDecoder().decode(cleanBase64);
    }

    private String detectMimeType(byte[] bytes) {
        if (bytes.length >= 2) {
            if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8) return "image/jpeg";
            if (bytes.length >= 4 && bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 &&
                    bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47) return "image/png";
            if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F') return "image/webp";
        }
        return "image/jpeg";
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getBucket() {
        return bucket;
    }
}