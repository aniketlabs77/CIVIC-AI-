package com.nagarseva.controller;

import com.nagarseva.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private com.nagarseva.service.UserService userService;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Unauthorized or user not found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("firebaseUid", user.getFirebaseUid());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("role", user.getRole());
        response.put("department", user.getDepartment());
        response.put("notificationsEnabled", user.isNotificationsEnabled());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync-profile")
    public ResponseEntity<?> syncProfile(@RequestBody Map<String, Object> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String roleStr = body.get("role") != null ? body.get("role").toString() : null;
        String nameStr = body.get("name") != null ? body.get("name").toString() : null;
        String deptStr = body.get("department") != null ? body.get("department").toString() : null;
        
        if (body.containsKey("notificationsEnabled")) {
            user.setNotificationsEnabled(Boolean.parseBoolean(body.get("notificationsEnabled").toString()));
        }

        if (nameStr != null && !nameStr.isBlank()) {
            user.setName(nameStr.trim());
        }
        if (deptStr != null && !deptStr.isBlank()) {
            user.setDepartment(deptStr.trim());
        }
        if (roleStr != null && !roleStr.isBlank()) {
            try {
                user.setRole(com.nagarseva.entity.UserRole.valueOf(roleStr.toUpperCase()));
            } catch (Exception ignored) {}
        }
        userService.updateUser(user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("firebaseUid", user.getFirebaseUid());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("role", user.getRole());
        response.put("department", user.getDepartment());
        response.put("notificationsEnabled", user.isNotificationsEnabled());
        return ResponseEntity.ok(response);
    }
}