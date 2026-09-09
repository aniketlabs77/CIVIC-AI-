package com.nagarseva.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintPriority;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.http.message.BasicClassicHttpResponse;
import org.apache.hc.core5.http.protocol.HttpContext;
import org.apache.hc.core5.io.CloseMode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class GeminiServiceTest {

    @Autowired
    private GeminiService geminiService;

    private StubHttpClient stubHttpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class StubHttpClient extends CloseableHttpClient {
        private ClassicHttpRequest lastRequest;
        private CloseableHttpResponse nextResponse;
        private IOException toThrow;

        public void setResponse(CloseableHttpResponse response) {
            this.nextResponse = response;
            this.toThrow = null;
        }

        public void setToThrow(IOException ex) {
            this.toThrow = ex;
            this.nextResponse = null;
        }

        public ClassicHttpRequest getLastRequest() {
            return lastRequest;
        }

        @Override
        protected CloseableHttpResponse doExecute(HttpHost target, ClassicHttpRequest request, HttpContext context) throws IOException {
            this.lastRequest = request;
            if (toThrow != null) {
                throw toThrow;
            }
            return nextResponse;
        }

        @Override
        public void close() throws IOException {
        }

        @Override
        public void close(CloseMode closeMode) {
        }
    }

    @BeforeEach
    public void setUp() {
        stubHttpClient = new StubHttpClient();
    }

    @AfterEach
    public void tearDown() {
        geminiService.setApiKey("");
        geminiService.setHttpClient(HttpClients.createDefault());
    }

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

    @Test
    public void testVerifyResolutionProofWithThreeImages() throws Exception {
        geminiService.setApiKey("test-gemini-key");
        geminiService.setHttpClient(stubHttpClient);

        String mockResponseBody = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "{\\"resolutionVerified\\": true, \\"resolutionVerificationNote\\": \\"Area reference confirmed baseline street geometry. Grievance pothole clearly asphalted in resolution photo.\\"}"
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        BasicClassicHttpResponse classicResponse = new BasicClassicHttpResponse(200);
        classicResponse.setEntity(new StringEntity(mockResponseBody, ContentType.APPLICATION_JSON));
        CloseableHttpResponse response = CloseableHttpResponse.adapt(classicResponse);
        stubHttpClient.setResponse(response);

        String areaRefPhoto = "area-reference/street_01.jpg";
        String grievancePhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
        String resolutionPhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

        GeminiService.ResolutionVerificationResult result = geminiService.verifyResolutionProof(
                "Road Damage",
                "Hot-mix asphalt patch applied and rolled",
                grievancePhoto,
                resolutionPhoto,
                areaRefPhoto
        );

        assertTrue(result.resolutionVerified(), "Resolution should be verified as true");
        assertTrue(result.resolutionVerificationNote().contains("Area reference confirmed"));

        ClassicHttpRequest sentRequest = stubHttpClient.getLastRequest();
        assertNotNull(sentRequest, "Expected HTTP request to have been sent to Gemini");

        String requestPayload = EntityUtils.toString(sentRequest.getEntity());
        JsonNode root = objectMapper.readTree(requestPayload);
        JsonNode parts = root.path("contents").get(0).path("parts");

        int inlineDataCount = 0;
        String promptText = "";
        for (JsonNode part : parts) {
            if (part.has("inline_data")) {
                inlineDataCount++;
            }
            if (part.has("text")) {
                promptText = part.get("text").asText();
            }
        }

        // Must contain exactly 3 inline image parts (AREA_REFERENCE + GRIEVANCE_PHOTO + RESOLUTION_PHOTO)
        assertEquals(3, inlineDataCount, "Expected exactly 3 image parts when area reference is provided");
        assertTrue(promptText.contains("AREA_REFERENCE"), "Prompt should explicitly label AREA_REFERENCE");
        assertTrue(promptText.contains("GRIEVANCE_PHOTO"), "Prompt should explicitly label GRIEVANCE_PHOTO");
        assertTrue(promptText.contains("RESOLUTION_PHOTO"), "Prompt should explicitly label RESOLUTION_PHOTO");
    }

    @Test
    public void testVerifyResolutionProofWithTwoImagesWhenAreaRefAbsent() throws Exception {
        geminiService.setApiKey("test-gemini-key");
        geminiService.setHttpClient(stubHttpClient);

        String mockResponseBody = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "{\\"resolutionVerified\\": true, \\"resolutionVerificationNote\\": \\"Verified repair without area reference.\\"}"
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        BasicClassicHttpResponse classicResponse = new BasicClassicHttpResponse(200);
        classicResponse.setEntity(new StringEntity(mockResponseBody, ContentType.APPLICATION_JSON));
        CloseableHttpResponse response = CloseableHttpResponse.adapt(classicResponse);
        stubHttpClient.setResponse(response);

        String grievancePhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
        String resolutionPhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

        GeminiService.ResolutionVerificationResult result = geminiService.verifyResolutionProof(
                "Drainage",
                "Cleared clogged drain grating",
                grievancePhoto,
                resolutionPhoto,
                null // Area reference absent
        );

        assertTrue(result.resolutionVerified());

        ClassicHttpRequest sentRequest = stubHttpClient.getLastRequest();
        assertNotNull(sentRequest);

        String requestPayload = EntityUtils.toString(sentRequest.getEntity());
        JsonNode root = objectMapper.readTree(requestPayload);
        JsonNode parts = root.path("contents").get(0).path("parts");

        int inlineDataCount = 0;
        String promptText = "";
        for (JsonNode part : parts) {
            if (part.has("inline_data")) {
                inlineDataCount++;
            }
            if (part.has("text")) {
                promptText = part.get("text").asText();
            }
        }

        // Must contain exactly 2 inline image parts when area reference is absent
        assertEquals(2, inlineDataCount, "Expected exactly 2 image parts when area reference is absent");
        assertFalse(promptText.contains("Image 1: AREA_REFERENCE"), "Prompt should not list AREA_REFERENCE as image 1");
        assertTrue(promptText.contains("GRIEVANCE_PHOTO"));
        assertTrue(promptText.contains("RESOLUTION_PHOTO"));
    }

    @Test
    public void testVerifyResolutionProofFailClosedOnApiError() {
        geminiService.setApiKey("test-gemini-key");
        geminiService.setHttpClient(stubHttpClient);
        stubHttpClient.setToThrow(new IOException("Remote API timeout"));

        GeminiService.ResolutionVerificationResult result = geminiService.verifyResolutionProof(
                "Road Damage",
                "Patch work",
                "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                null
        );

        // Crucial requirement: Must fail closed (false) on error/exception
        assertFalse(result.resolutionVerified(), "Failure must default to false (fail-closed)");
        assertTrue(result.resolutionVerificationNote().toLowerCase().contains("manual review required"));
    }

    @Test
    public void testVerifyResolutionProofFailClosedWhenUnconfigured() {
        geminiService.setApiKey(null);

        GeminiService.ResolutionVerificationResult result = geminiService.verifyResolutionProof(
                "Road Damage",
                "Patch work",
                "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                null
        );

        // Crucial requirement: Must fail closed (false) when API key is missing
        assertFalse(result.resolutionVerified(), "Unconfigured key must default to false (fail-closed)");
        assertTrue(result.resolutionVerificationNote().toLowerCase().contains("manual review required"));
    }
}
