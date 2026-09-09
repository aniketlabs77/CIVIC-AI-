package com.nagarseva.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "DATABASE_URL=jdbc:h2:mem:prodtestdb;DB_CLOSE_DELAY=-1",
        "FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json",
        "GEMINI_API_KEY=test-gemini-key"
})
@AutoConfigureMockMvc
@ActiveProfiles("prod")
public class FirebaseAuthFilterProdTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void demoToken_inProdProfile_shouldBeRejectedForAdminEndpoint() throws Exception {
        // Attempting to bypass auth with a demo-token claiming ADMIN role in prod
        mockMvc.perform(get("/api/admin/complaints")
                .header("Authorization", "Bearer demo-token:ADMIN:admin@nagarseva.com:demo-admin-1:Roads"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void demoToken_inProdProfile_shouldBeRejectedForAuthenticatedEndpoint() throws Exception {
        // Attempting to access authenticated /api/auth/me with demo-token in prod
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer demo-token:CITIZEN:citizen@nagarseva.com:demo-uid-1:"))
                .andExpect(status().isUnauthorized());
    }
}
