package com.nagarseva.controller;

import com.nagarseva.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/safety")
public class SafetyController {

    @Autowired
    private ComplaintService complaintService;

    @PostMapping("/check-route")
    public ResponseEntity<Map<String, Object>> checkRouteSafety(
            @RequestBody Map<String, Double> routeData) {
        Double startLat = routeData.get("startLat");
        Double startLng = routeData.get("startLng");
        Double endLat = routeData.get("endLat");
        Double endLng = routeData.get("endLng");

        if (startLat == null || startLng == null || endLat == null || endLng == null) {
            return ResponseEntity.badRequest().build();
        }

        Map<String, Object> result = complaintService.checkRouteSafety(
            startLat, startLng, endLat, endLng
        );
        return ResponseEntity.ok(result);
    }
}