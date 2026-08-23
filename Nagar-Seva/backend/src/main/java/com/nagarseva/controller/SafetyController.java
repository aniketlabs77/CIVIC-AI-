package com.nagarseva.controller;

import com.nagarseva.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/safety")
public class SafetyController {

    @Autowired
    private ComplaintService complaintService;

    /**
     * GET /api/safety/heatmap - Get safety heatmap data
     * Returns all safety-relevant complaints with riskLevel and timeOfDay
     */
    @GetMapping("/heatmap")
    public ResponseEntity<List<Map<String, Object>>> getSafetyHeatmap() {
        List<Map<String, Object>> heatmap = complaintService.getSafetyHeatmap();
        return ResponseEntity.ok(heatmap);
    }

    /**
     * GET /api/safety/route-check - Check route safety
     * Query params: startLat, startLng, endLat, endLng
     * Returns warning if HIGH risk safety incidents are near the path
     */
    @GetMapping("/route-check")
    public ResponseEntity<Map<String, Object>> checkRouteSafety(
            @RequestParam double startLat,
            @RequestParam double startLng,
            @RequestParam double endLat,
            @RequestParam double endLng) {
        
        Map<String, Object> result = complaintService.checkRouteSafety(startLat, startLng, endLat, endLng);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/safety/route-check-geometry - Check route safety along real road coordinates
     * Request body: [[lat1, lng1], [lat2, lng2], ...]
     */
    @PostMapping("/route-check-geometry")
    public ResponseEntity<Map<String, Object>> checkRouteGeometry(@RequestBody List<List<Double>> coordinates) {
        Map<String, Object> result = complaintService.checkRouteGeometrySafety(coordinates);
        return ResponseEntity.ok(result);
    }
}