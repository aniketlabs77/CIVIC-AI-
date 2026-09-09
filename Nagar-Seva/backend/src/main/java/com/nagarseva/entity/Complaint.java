package com.nagarseva.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;


@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Category is required")
    @Column(nullable = false)
    private String category;

    @NotBlank(message = "Description is required")
    @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotBlank(message = "Location is required")
    @Column(nullable = false)
    private String location;

    @NotBlank(message = "Ward is required")
    @Column(nullable = false)
    private String ward;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    @Column(nullable = false)
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    @Column(nullable = false)
    private Double longitude;

    @Column
    private String photoUrl;

    @Column(columnDefinition = "LONGTEXT")
    private String photoData;

    // Object storage keys (for S3/MinIO migration)
    @Column
    private String photoObjectKey;

    @Column
    private String resolutionPhotoObjectKey;

    @Column
    private String areaRefObjectKey;

    @Column
    private String routedAuthority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Enumerated(EnumType.STRING)
    @Column
    private ComplaintPriority priority;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime resolvedAt;

    @Column
    private Boolean escalated = false;

    // New fields for safety heatmap
    @Column
    private String issueType; // SAFETY, INFRASTRUCTURE, etc.

    @Column
    private String resolutionPhotoUrl; // base64 encoded resolution photo

    @Column(columnDefinition = "TEXT")
    private String resolutionNote;

    @Column
    private Boolean imageVerified;

    @Column(columnDefinition = "TEXT")
    private String imageVerificationNote;

    @Column
    private Boolean resolutionVerified;

    @Column(columnDefinition = "TEXT")
    private String resolutionVerificationNote;

    @Column
    private String areaReferencePhotoUrl;

    @Column
    private LocalDate areaReferenceCapturedAt;

    @Column
    private LocalDateTime lastReminderSentAt;


    @Column
    private Integer reminderCount = 0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "citizen_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "complaints"})
    private User citizen;

    public Complaint() {
    }

    public Complaint(String category, String description, String location, String ward, Double latitude, Double longitude) {
        this.category = category;
        this.description = description;
        this.location = location;
        this.ward = ward;
        this.latitude = latitude;
        this.longitude = longitude;
        this.createdAt = LocalDateTime.now();
        this.escalated = false;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getPhotoData() {
        return photoData;
    }

    public void setPhotoData(String photoData) {
        this.photoData = photoData;
    }

    public String getPhotoObjectKey() {
        return photoObjectKey;
    }

    public void setPhotoObjectKey(String photoObjectKey) {
        this.photoObjectKey = photoObjectKey;
    }

    public String getResolutionPhotoObjectKey() {
        return resolutionPhotoObjectKey;
    }

    public void setResolutionPhotoObjectKey(String resolutionPhotoObjectKey) {
        this.resolutionPhotoObjectKey = resolutionPhotoObjectKey;
    }

    public String getAreaRefObjectKey() {
        return areaRefObjectKey;
    }

    public void setAreaRefObjectKey(String areaRefObjectKey) {
        this.areaRefObjectKey = areaRefObjectKey;
    }

    public String getRoutedAuthority() {
        return routedAuthority;
    }

    public void setRoutedAuthority(String routedAuthority) {
        this.routedAuthority = routedAuthority;
    }

    public ComplaintStatus getStatus() {
        return status;
    }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
    }

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public ComplaintPriority getPriority() {
        return priority;
    }

    public void setPriority(ComplaintPriority priority) {
        this.priority = priority;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public Boolean getEscalated() {
        return escalated;
    }

    public void setEscalated(Boolean escalated) {
        this.escalated = escalated;
    }

    public String getIssueType() {
        return issueType;
    }

    public void setIssueType(String issueType) {
        this.issueType = issueType;
    }

    public String getResolutionPhotoUrl() {
        return resolutionPhotoUrl;
    }

    public void setResolutionPhotoUrl(String resolutionPhotoUrl) {
        this.resolutionPhotoUrl = resolutionPhotoUrl;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public User getCitizen() {
        return citizen;
    }

    public void setCitizen(User citizen) {
        this.citizen = citizen;
    }

    public Boolean getImageVerified() {
        return imageVerified;
    }

    public void setImageVerified(Boolean imageVerified) {
        this.imageVerified = imageVerified;
    }

    public String getImageVerificationNote() {
        return imageVerificationNote;
    }

    public void setImageVerificationNote(String imageVerificationNote) {
        this.imageVerificationNote = imageVerificationNote;
    }

    public Boolean getResolutionVerified() {
        return resolutionVerified;
    }

    public void setResolutionVerified(Boolean resolutionVerified) {
        this.resolutionVerified = resolutionVerified;
    }

    public String getResolutionVerificationNote() {
        return resolutionVerificationNote;
    }

    public void setResolutionVerificationNote(String resolutionVerificationNote) {
        this.resolutionVerificationNote = resolutionVerificationNote;
    }

    public LocalDateTime getLastReminderSentAt() {
        return lastReminderSentAt;
    }

    public void setLastReminderSentAt(LocalDateTime lastReminderSentAt) {
        this.lastReminderSentAt = lastReminderSentAt;
    }

    public Integer getReminderCount() {
        return reminderCount != null ? reminderCount : 0;
    }

    public void setReminderCount(Integer reminderCount) {
        this.reminderCount = reminderCount;
    }

    public String getAreaReferencePhotoUrl() {
        return areaReferencePhotoUrl;
    }

    public void setAreaReferencePhotoUrl(String areaReferencePhotoUrl) {
        this.areaReferencePhotoUrl = areaReferencePhotoUrl;
    }

    public LocalDate getAreaReferenceCapturedAt() {
        return areaReferenceCapturedAt;
    }

    public void setAreaReferenceCapturedAt(LocalDate areaReferenceCapturedAt) {
        this.areaReferenceCapturedAt = areaReferenceCapturedAt;
    }

    @Override

    public String toString() {
        return "Complaint{" +
                "id=" + id +
                ", category='" + category + '\'' +
                ", description='" + description + '\'' +
                ", location='" + location + '\'' +
                ", ward='" + ward + '\'' +
                ", status=" + status +
                ", priority=" + priority +
                ", routedAuthority='" + routedAuthority + '\'' +
                ", createdAt=" + createdAt +
                ", resolvedAt=" + resolvedAt +
                ", escalated=" + escalated +
                ", issueType='" + issueType + '\'' +
                '}';
    }

}
