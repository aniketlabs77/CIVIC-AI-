package com.nagarseva.service;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintPriority;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class GeminiServiceTest {

    @Autowired
    private GeminiService geminiService;

    @Test
    public void testClassifyComplaintFallback() {
        Complaint complaint = new Complaint(
                "Streetlight",
                "Dark alley with broken lamp post",
                "Sector 4, Main Street",
                "Ward 1",
                28.6139,
                77.2090
        );

        GeminiService.ComplaintAnalysisResult result = geminiService.classifyAndVerifyComplaint(complaint, null);

        assertNotNull(result);
        assertEquals("Electricity Department", result.routedAuthority());
        assertEquals(ComplaintPriority.MEDIUM, result.priority());
        assertNotNull(result.aiSummary());
        assertNull(result.imageVerified(), "imageVerified should be null when no photo is provided");
    }

    @Test
    public void testClassifyComplaintWithPhotoFallback() {
        Complaint complaint = new Complaint(
                "Road Damage",
                "Massive pothole in the middle of highway",
                "Expressway near exit 3",
                "Ward 2",
                28.6200,
                77.2150
        );

        String sampleBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
        GeminiService.ComplaintAnalysisResult result = geminiService.classifyAndVerifyComplaint(complaint, sampleBase64);

        assertNotNull(result);
        assertEquals("Municipal Road Department", result.routedAuthority());
        assertNotNull(result.imageVerified());
        assertNotNull(result.imageVerificationNote());
    }

    @Test
    public void testChatAssistant() {
        String query = "How do I report a pothole on my street?";
        String reply = geminiService.chatAssistant(query, null);

        assertNotNull(reply);
        assertFalse(reply.isBlank(), "Chat assistant should return a non-empty response");
    }
}
