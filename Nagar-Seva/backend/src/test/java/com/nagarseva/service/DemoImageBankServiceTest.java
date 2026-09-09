package com.nagarseva.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class DemoImageBankServiceTest {

    private DemoImageBankService service;

    @BeforeEach
    public void setUp() {
        service = new DemoImageBankService();
        service.setLocations(List.of(
                new DemoImageBankService.DemoLocationEntry(
                        28.4744,
                        77.5040,
                        "area-reference/street_01.jpg",
                        "grievance/pothole_014.jpg",
                        "resolved/clean_road_09.jpg",
                        "2026-01-15"
                ),
                new DemoImageBankService.DemoLocationEntry(
                        28.6139,
                        77.2090,
                        "area-reference/street_02.jpg",
                        "grievance/pothole_015.jpg",
                        "resolved/clean_road_10.jpg",
                        "2026-02-10"
                )
        ));
    }

    @Test
    public void testFindNearestReferenceMatchesClosestCoordinate() {
        // Query coordinate very close to Point A (28.4744, 77.5040)
        Optional<AreaReferenceImage> matchA = service.findNearestReference(28.4745, 77.5041);
        assertTrue(matchA.isPresent(), "Expected nearest reference image to be found");
        assertTrue(matchA.get().photoUrl().contains("street_01.jpg"), "Expected match to point A's street_01.jpg");
        assertEquals(28.4744, matchA.get().latitude(), 0.001);
        assertEquals(77.5040, matchA.get().longitude(), 0.001);
        assertNotNull(matchA.get().capturedAt(), "Expected capturedAt date to be parsed");

        // Query coordinate very close to Point B (28.6139, 77.2090)
        Optional<AreaReferenceImage> matchB = service.findNearestReference(28.6140, 77.2091);
        assertTrue(matchB.isPresent(), "Expected nearest reference image to be found");
        assertTrue(matchB.get().photoUrl().contains("street_02.jpg"), "Expected match to point B's street_02.jpg");
    }

    @Test
    public void testFindNearestImageRespectsRadiusMeters() {
        // Point is ~15 meters away from Point A
        Optional<AreaReferenceImage> withinRadius = service.findNearestImage(28.4745, 77.5041, 1000.0);
        assertTrue(withinRadius.isPresent(), "Should match when within 1000m radius");

        // Search with a tiny 1 meter radius
        Optional<AreaReferenceImage> outsideRadius = service.findNearestImage(28.4745, 77.5041, 1.0);
        assertTrue(outsideRadius.isEmpty(), "Should be empty when outside strict 1m radius");
    }

    @Test
    public void testEmptyLocationsReturnsEmpty() {
        DemoImageBankService emptyService = new DemoImageBankService();
        emptyService.setLocations(List.of());

        Optional<AreaReferenceImage> result = emptyService.findNearestReference(28.4744, 77.5040);
        assertTrue(result.isEmpty(), "Should return empty when location bank is empty");
    }

    @Test
    public void testClasspathDefaultInit() {
        DemoImageBankService defaultService = new DemoImageBankService();
        defaultService.init();

        assertFalse(defaultService.getLocations().isEmpty(), "Default classpath init should load demo-locations.json");
        Optional<AreaReferenceImage> match = defaultService.findNearestReference(28.4744, 77.5040);
        assertTrue(match.isPresent());
        assertTrue(match.get().photoUrl().contains("street_01.jpg"));
    }
}
