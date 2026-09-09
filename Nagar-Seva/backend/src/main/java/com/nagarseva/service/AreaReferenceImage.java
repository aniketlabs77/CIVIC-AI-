package com.nagarseva.service;

import java.time.LocalDate;

/**
 * Encapsulates reference imagery metadata (e.g. from bundled demo assets or Mapillary API).
 */
public record AreaReferenceImage(
        String photoUrl,
        LocalDate capturedAt,
        Double latitude,
        Double longitude
) {
    public String getPhotoUrl() {
        return photoUrl;
    }

    public LocalDate getCapturedAt() {
        return capturedAt;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }
}
