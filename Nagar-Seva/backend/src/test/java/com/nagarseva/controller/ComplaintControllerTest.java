package com.nagarseva.controller;

import com.nagarseva.config.RateLimitingFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ComplaintControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @BeforeEach
    public void setup() {
        rateLimitingFilter.reset();
    }

    @Test
    public void createComplaint_happyPath_returnsCreated() throws Exception {
        String payload = """
        {
            "category": "Roads",
            "description": "Large dangerous pothole causing traffic slowdown near junction",
            "location": "Sector 10 Circle, Main Road",
            "ward": "Ward 2",
            "latitude": 28.6340,
            "longitude": 77.4470
        }
        """;

        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", "10.0.1.50")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.category").value("Roads"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.routedAuthority").isNotEmpty());
    }

    @Test
    public void createComplaint_validationFailure_missingCategory_returnsBadRequest() throws Exception {
        String payload = """
        {
            "category": "",
            "description": "Valid description of the issue that has more than ten characters",
            "location": "Sector 10 Circle",
            "ward": "Ward 1",
            "latitude": 28.6340,
            "longitude": 77.4470
        }
        """;

        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", "10.0.1.51")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.category").exists());
    }

    @Test
    public void createComplaint_validationFailure_shortDescription_returnsBadRequest() throws Exception {
        String payload = """
        {
            "category": "Garbage",
            "description": "Short",
            "location": "Sector 4",
            "ward": "Ward 1",
            "latitude": 28.6100,
            "longitude": 77.2000
        }
        """;

        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", "10.0.1.52")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.description").exists());
    }

    @Test
    public void createComplaint_photoExceeds2MB_returnsPayloadTooLarge() throws Exception {
        // Construct a large base64 payload (> 2MB binary -> > 2.8MB base64)
        String largeBase64 = "data:image/jpeg;base64," + "A".repeat(3_000_000);
        String payload = String.format("""
        {
            "category": "Streetlight",
            "description": "Streetlight broken with excessively large image attached",
            "location": "Ward 1 Park",
            "ward": "Ward 1",
            "latitude": 28.6500,
            "longitude": 77.2200,
            "photoData": "%s"
        }
        """, largeBase64);

        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", "10.0.1.53")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error").value("Payload Too Large"))
                .andExpect(jsonPath("$.message", containsString("2MB")));
    }

    @Test
    public void listComplaints_returnsPagedResults() throws Exception {
        mockMvc.perform(get("/api/complaints")
                .param("page", "0")
                .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber())
                .andExpect(jsonPath("$.totalPages").isNumber())
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.number").value(0));
    }

    @Test
    public void patchStatus_happyPath_updatesStatus() throws Exception {
        mockMvc.perform(patch("/api/complaints/1/status")
                .header("Authorization", "Bearer demo-token:citizen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    public void patchStatus_missingStatus_returnsBadRequest() throws Exception {
        mockMvc.perform(patch("/api/complaints/1/status")
                .header("Authorization", "Bearer demo-token:citizen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void rateLimiting_excessiveRequestsFromSameIP_returnsTooManyRequests() throws Exception {
        String testIp = "192.0.2.99";
        String payload = """
        {
            "category": "Drainage",
            "description": "Drainage overflowing into street during moderate rainfall",
            "location": "Sector 9 lane 3",
            "ward": "Ward 1",
            "latitude": 28.6200,
            "longitude": 77.2100
        }
        """;

        // Limit is 5 requests per minute. First 5 should succeed (201 Created)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/complaints")
                    .header("X-Forwarded-For", testIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                    .andExpect(status().isCreated());
        }

        // 6th request from the same IP within the minute must be blocked with HTTP 429
        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", testIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.error").value("Too Many Requests"));
    }

    @Test
    public void createComplaint_withCoordinatesNearDemoAsset_populatesAreaReference() throws Exception {
        String payload = """
        {
            "category": "Road Damage",
            "description": "Road damage right near demo location in ward 1",
            "location": "Sector 4 Main Road",
            "ward": "Ward 1",
            "latitude": 28.4744,
            "longitude": 77.5040
        }
        """;

        mockMvc.perform(post("/api/complaints")
                .header("X-Forwarded-For", "10.0.1.77")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.areaReferencePhotoUrl").value(containsString("area-reference/street_01.jpg")))
                .andExpect(jsonPath("$.areaReferenceCapturedAt").value("2026-01-15"));
    }
}

