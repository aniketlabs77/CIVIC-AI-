package com.nagarseva.service;

import java.util.Optional;

/**
 * Contract for reference imagery lookups (bundled demo assets or Mapillary API).
 */
public interface AreaReferenceService {

    /**
     * Find nearest reference image using latitude and longitude coordinates.
     */
    Optional<AreaReferenceImage> findNearestReference(double lat, double lng);

    /**
     * Find nearest reference image within a maximum search radius (in meters).
     */
    Optional<AreaReferenceImage> findNearestImage(double lat, double lng, double radiusMeters);
}
