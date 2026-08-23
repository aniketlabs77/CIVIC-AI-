package com.nagarseva.controller;

import com.nagarseva.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * GET /api/notifications - Get all recently dispatched notification emails & reminder logs
     */
    @GetMapping
    public ResponseEntity<?> getRecentNotifications() {
        List<NotificationService.NotificationRecord> logs = notificationService.getRecentNotifications();
        return ResponseEntity.ok(Map.of(
                "totalDispatched", logs.size(),
                "notifications", logs
        ));
    }
}
