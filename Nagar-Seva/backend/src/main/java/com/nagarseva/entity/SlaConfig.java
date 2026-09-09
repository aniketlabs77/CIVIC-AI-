package com.nagarseva.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "sla_configs", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"category", "department"})
})
public class SlaConfig {

    @EmbeddedId
    private SlaConfigId id;

    @NotNull
    @Min(1)
    @Column(name = "response_sla_hours", nullable = false)
    private Integer responseSlaHours; // Initial response SLA

    @NotNull
    @Min(1)
    @Column(name = "resolution_sla_hours", nullable = false)
    private Integer resolutionSlaHours; // Full resolution SLA

    @Min(1)
    @Column(name = "escalation_tier1_hours")
    private Integer escalationTier1Hours; // First escalation

    @Min(1)
    @Column(name = "escalation_tier2_hours")
    private Integer escalationTier2Hours; // Second escalation (to super-admin)

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = java.time.LocalDateTime.now();
    }

    public SlaConfig() {}

    public SlaConfig(String category, String department, Integer responseSlaHours,
                     Integer resolutionSlaHours, Integer escalationTier1Hours,
                     Integer escalationTier2Hours) {
        this.id = new SlaConfigId(category, department);
        this.responseSlaHours = responseSlaHours;
        this.resolutionSlaHours = resolutionSlaHours;
        this.escalationTier1Hours = escalationTier1Hours;
        this.escalationTier2Hours = escalationTier2Hours;
    }

    // Getters and Setters
    public SlaConfigId getId() {
        return id;
    }

    public void setId(SlaConfigId id) {
        this.id = id;
    }

    public String getCategory() {
        return id != null ? id.getCategory() : null;
    }

    public String getDepartment() {
        return id != null ? id.getDepartment() : null;
    }

    public Integer getResponseSlaHours() {
        return responseSlaHours;
    }

    public void setResponseSlaHours(Integer responseSlaHours) {
        this.responseSlaHours = responseSlaHours;
    }

    public Integer getResolutionSlaHours() {
        return resolutionSlaHours;
    }

    public void setResolutionSlaHours(Integer resolutionSlaHours) {
        this.resolutionSlaHours = resolutionSlaHours;
    }

    public Integer getEscalationTier1Hours() {
        return escalationTier1Hours;
    }

    public void setEscalationTier1Hours(Integer escalationTier1Hours) {
        this.escalationTier1Hours = escalationTier1Hours;
    }

    public Integer getEscalationTier2Hours() {
        return escalationTier2Hours;
    }

    public void setEscalationTier2Hours(Integer escalationTier2Hours) {
        this.escalationTier2Hours = escalationTier2Hours;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public java.time.LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(java.time.LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public java.time.LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(java.time.LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Embeddable
    public static class SlaConfigId implements java.io.Serializable {
        @NotBlank
        @Column(name = "category", nullable = false, length = 100)
        private String category;

        @NotBlank
        @Column(name = "department", nullable = false, length = 200)
        private String department;

        public SlaConfigId() {}

        public SlaConfigId(String category, String department) {
            this.category = category;
            this.department = department;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getDepartment() {
            return department;
        }

        public void setDepartment(String department) {
            this.department = department;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            SlaConfigId that = (SlaConfigId) o;
            return java.util.Objects.equals(category, that.category) &&
                    java.util.Objects.equals(department, that.department);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(category, department);
        }
    }
}