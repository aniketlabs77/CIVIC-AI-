package com.nagarseva.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void unauthenticated_accessingAdminComplaints_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/complaints"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "citizen_user", roles = {"CITIZEN"})
    public void citizenRole_accessingAdminComplaints_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/complaints"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    public void adminRole_accessingAdminComplaints_returnsPagedComplaints() throws Exception {
        mockMvc.perform(get("/api/admin/complaints")
                .param("page", "0")
                .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber())
                .andExpect(jsonPath("$.totalPages").isNumber())
                .andExpect(jsonPath("$.size").value(5));
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    public void adminRole_resolveComplaint_happyPath_returnsOk() throws Exception {
        String resolutionPayload = """
        {
            "resolutionPhotoUrl": "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5",
            "resolutionNote": "Field engineering team completed asphalt repair and leveled surface"
        }
        """;

        mockMvc.perform(patch("/api/admin/complaints/1/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resolutionPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Complaint marked as resolved"))
                .andExpect(jsonPath("$.complaint.status").value("RESOLVED"));
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    public void adminRole_resolveComplaint_missingPhoto_returnsBadRequest() throws Exception {
        String invalidPayload = """
        {
            "resolutionPhotoUrl": "",
            "resolutionNote": "Note provided but photo is missing"
        }
        """;

        mockMvc.perform(patch("/api/admin/complaints/1/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Resolution photo is required"));
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    public void adminRole_resolveComplaint_missingNote_returnsBadRequest() throws Exception {
        String invalidPayload = """
        {
            "resolutionPhotoUrl": "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5",
            "resolutionNote": ""
        }
        """;

        mockMvc.perform(patch("/api/admin/complaints/1/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Resolution note is required"));
    }
}
