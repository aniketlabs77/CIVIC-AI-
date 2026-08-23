package com.nagarseva.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void unauthenticatedAdminComplaints_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/complaints"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void unauthenticatedMyComplaints_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/complaints/my"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void unauthenticatedCreateComplaint_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/complaints")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                {
                    "category": "Streetlight",
                    "description": "Streetlight broken on street 5",
                    "location": "Sector 5",
                    "ward": "Ward 1",
                    "latitude": 28.6139,
                    "longitude": 77.2090
                }
                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void unauthenticatedAuthMe_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void publicDashboardStats_shouldBeAccessible() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isOk());
    }

    @Test
    public void publicSafetyHeatmap_shouldBeAccessible() throws Exception {
        mockMvc.perform(get("/api/safety/heatmap"))
                .andExpect(status().isOk());
    }

    @Test
    public void publicComplaintsList_shouldBeAccessible() throws Exception {
        mockMvc.perform(get("/api/complaints"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "citizen", roles = {"CITIZEN"})
    public void citizenRole_accessingAdminComplaints_shouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/complaints"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void adminRole_accessingAdminComplaints_shouldReturnOk() throws Exception {
        mockMvc.perform(get("/api/admin/complaints"))
                .andExpect(status().isOk());
    }

    @Test
    public void publicAiChat_shouldBeAccessible() throws Exception {
        mockMvc.perform(post("/api/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                {
                    "message": "Hello NagarSeva!"
                }
                """))
                .andExpect(status().isOk());
    }
}
