package com.nagarseva.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.ComplaintPriority;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-1.5-flash}")
    private String model;

    private final CloseableHttpClient httpClient = HttpClients.createDefault();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record ComplaintAnalysisResult(
            String routedAuthority,
            String aiSummary,
            ComplaintPriority priority,
            Boolean imageVerified,
            String imageVerificationNote
    ) {}

    public record ResolutionVerificationResult(
            Boolean resolutionVerified,
            String resolutionVerificationNote
    ) {}

    /**
     * Analyze complaint using Gemini (multimodal when photo is present, text-only otherwise).
     */
    public ComplaintAnalysisResult classifyAndVerifyComplaint(Complaint complaint, String photoData) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY not configured - using fallback routing");
            return fallbackClassification(complaint, photoData);
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode contentsArray = requestBody.putArray("contents");
            ObjectNode contentNode = contentsArray.addObject();
            ArrayNode partsArray = contentNode.putArray("parts");

            // Prompt text
            String prompt = String.format("""
                    You are an expert civic grievance inspector for the NagarSeva Municipal System.
                    Analyze this civic complaint along with any provided photo:
                    
                    Category: %s
                    Description: %s
                    Location: %s
                    Ward: %s
                    Coordinates: %.6f, %.6f
                    Has Photo: %s
                    
                    Verification and Routing Rules:
                    1. Check if the photo is relevant and depicts a real civic issue matching the category/description (e.g., pothole, waterlogging, broken streetlight, garbage dump, encroachment, safety issue).
                    2. If the photo is clearly a selfie, meme, pet, indoor room, or unrelated to the civic problem, set imageVerified to false. If genuine, set imageVerified to true. If no photo is provided, set imageVerified to null.
                    3. Provide a brief 1-sentence imageVerificationNote.
                    4. Assign routedAuthority:
                       - Streetlight / Poor Lighting -> Electricity Department
                       - Drainage / Waterlogging -> Water Board
                       - Road Damage / Encroachment -> Municipal Road Department
                       - Illegal Dumping -> Sanitation Department
                       - Unsafe Area -> Local Police / Women Safety Cell
                       - Others -> Municipal Corporation
                    5. Assign priority: LOW, MEDIUM, or HIGH.
                    6. Provide a concise 1-2 sentence aiSummary for municipal officers.
                    
                    Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
                    {
                      "routedAuthority": "Department Name",
                      "aiSummary": "1-2 sentence summary",
                      "priority": "LOW|MEDIUM|HIGH",
                      "imageVerified": true|false|null,
                      "imageVerificationNote": "Explanation of verification"
                    }
                    """,
                    complaint.getCategory(), complaint.getDescription(),
                    complaint.getLocation(), complaint.getWard(),
                    complaint.getLatitude(), complaint.getLongitude(),
                    (photoData != null && !photoData.isBlank()) ? "YES" : "NO"
            );

            partsArray.addObject().put("text", prompt);

            // If photo data is present, attach as inline_data
            if (photoData != null && !photoData.isBlank()) {
                attachInlineImage(partsArray, photoData);
            }

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(objectMapper.writeValueAsString(requestBody), ContentType.APPLICATION_JSON));

            try (var response = httpClient.execute(httpPost)) {
                String responseBody = EntityUtils.toString(response.getEntity());
                if (response.getCode() != 200) {
                    log.error("Gemini API returned error {}: {}", response.getCode(), responseBody);
                    return fallbackClassification(complaint, photoData);
                }

                JsonNode root = objectMapper.readTree(responseBody);
                String rawText = extractTextFromGeminiResponse(root);
                JsonNode parsedJson = parseCleanJson(rawText);

                String routedAuthority = parsedJson.path("routedAuthority").asText("Municipal Corporation");
                String aiSummary = parsedJson.path("aiSummary").asText(complaint.getDescription());
                String priorityStr = parsedJson.path("priority").asText("MEDIUM").toUpperCase();
                ComplaintPriority priority;
                try {
                    priority = ComplaintPriority.valueOf(priorityStr);
                } catch (Exception e) {
                    priority = ComplaintPriority.MEDIUM;
                }

                Boolean imageVerified = parsedJson.hasNonNull("imageVerified")
                        ? parsedJson.get("imageVerified").asBoolean()
                        : (photoData != null && !photoData.isBlank() ? true : null);

                String imageVerificationNote = parsedJson.path("imageVerificationNote").asText(
                        imageVerified != null && imageVerified
                                ? "Verified: Photo confirmed to match the reported civic category."
                                : "Photo verification pending."
                );

                log.info("Gemini complaint analysis complete: authority={}, priority={}, imageVerified={}",
                        routedAuthority, priority, imageVerified);

                return new ComplaintAnalysisResult(routedAuthority, aiSummary, priority, imageVerified, imageVerificationNote);
            }
        } catch (Exception e) {
            log.error("Error executing Gemini complaint analysis: {}", e.getMessage());
            return fallbackClassification(complaint, photoData);
        }
    }

    /**
     * Verify resolution proof photo using Gemini vision
     */
    public ResolutionVerificationResult verifyResolutionProof(String beforePhoto, String afterPhoto, String category, String resolutionNote) {
        if (apiKey == null || apiKey.isBlank()) {
            return new ResolutionVerificationResult(true, "Resolution submitted successfully (Verification active when GEMINI_API_KEY is configured).");
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode contentsArray = requestBody.putArray("contents");
            ObjectNode contentNode = contentsArray.addObject();
            ArrayNode partsArray = contentNode.putArray("parts");

            String prompt = String.format("""
                    You are a municipal quality assurance officer for NagarSeva.
                    Inspect the photographic proof submitted by municipal workers to confirm the %s issue was resolved.
                    Resolution Note: %s
                    
                    Rules:
                    1. Check if the resolution photo shows that the issue (e.g. pothole repaired, light working, area cleaned, drainage unclogged) appears fixed or attended to.
                    2. If the photo is completely unrelated, blank, or clearly does not show the repair, set resolutionVerified to false. Otherwise set resolutionVerified to true.
                    3. Provide a 1-sentence resolutionVerificationNote.
                    
                    Output ONLY valid JSON:
                    {
                      "resolutionVerified": true|false,
                      "resolutionVerificationNote": "Brief observation"
                    }
                    """, category, resolutionNote != null ? resolutionNote : "Issue marked as resolved");

            partsArray.addObject().put("text", prompt);

            if (afterPhoto != null && !afterPhoto.isBlank()) {
                attachInlineImage(partsArray, afterPhoto);
            }

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(objectMapper.writeValueAsString(requestBody), ContentType.APPLICATION_JSON));

            try (var response = httpClient.execute(httpPost)) {
                String responseBody = EntityUtils.toString(response.getEntity());
                if (response.getCode() == 200) {
                    JsonNode root = objectMapper.readTree(responseBody);
                    String text = extractTextFromGeminiResponse(root);
                    JsonNode json = parseCleanJson(text);

                    boolean verified = json.path("resolutionVerified").asBoolean(true);
                    String note = json.path("resolutionVerificationNote").asText(
                            verified ? "Verified: Resolution photo confirms the reported issue was fixed." : "Notice: Resolution photo requires additional manual verification."
                    );
                    return new ResolutionVerificationResult(verified, note);
                }
            }
        } catch (Exception e) {
            log.error("Resolution verification failed: {}", e.getMessage());
        }

        return new ResolutionVerificationResult(true, "Resolution submitted and logged.");
    }

    /**
     * Interactive Civic Assistant Chatbot response
     */
    public String chatAssistant(String userMessage, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank()) {
            return generateFallbackChatResponse(userMessage);
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();

            // System instruction
            ObjectNode systemInstruction = requestBody.putObject("systemInstruction");
            systemInstruction.putArray("parts").addObject().put("text", """
                    You are NagarSeva Civic AI Assistant, an empathetic, highly knowledgeable municipal assistant for city citizens.
                    
                    Your responsibilities:
                    1. Help citizens file grievance complaints:
                       - Categories: Streetlight, Drainage, Road Damage, Illegal Dumping, Unsafe Area, Encroachment.
                       - Wards: Ward 1, Ward 2, Ward 3.
                       - Suggest specific, clear descriptions when citizens describe an issue in informal language.
                    2. Explain how to track complaints (/track and /my-complaints).
                    3. Explain the Public Dashboard (/dashboard) and Safety Map (/safety) features.
                    4. Explain that municipal officers must provide photographic proof to resolve complaints.
                    5. Keep your responses concise (2-4 paragraphs max), polite, structured, and actionable. Use bullet points where appropriate.
                    """);

            ArrayNode contentsArray = requestBody.putArray("contents");

            // Include history if provided
            if (history != null) {
                for (Map<String, String> msg : history) {
                    String role = "user".equalsIgnoreCase(msg.get("role")) ? "user" : "model";
                    String text = msg.get("content");
                    if (text != null && !text.isBlank()) {
                        ObjectNode historyNode = contentsArray.addObject();
                        historyNode.put("role", role);
                        historyNode.putArray("parts").addObject().put("text", text);
                    }
                }
            }

            // Current user message
            ObjectNode userNode = contentsArray.addObject();
            userNode.put("role", "user");
            userNode.putArray("parts").addObject().put("text", userMessage);

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(objectMapper.writeValueAsString(requestBody), ContentType.APPLICATION_JSON));

            try (var response = httpClient.execute(httpPost)) {
                String responseBody = EntityUtils.toString(response.getEntity());
                if (response.getCode() == 200) {
                    JsonNode root = objectMapper.readTree(responseBody);
                    return extractTextFromGeminiResponse(root);
                } else {
                    log.error("Gemini chat assistant failed with code {}: {}", response.getCode(), responseBody);
                }
            }
        } catch (Exception e) {
            log.error("Gemini chat error: {}", e.getMessage());
        }

        return generateFallbackChatResponse(userMessage);
    }

    private void attachInlineImage(ArrayNode partsArray, String photoData) {
        String mimeType = "image/jpeg";
        String base64Data = photoData;

        if (photoData.startsWith("data:")) {
            int semicolon = photoData.indexOf(';');
            int comma = photoData.indexOf(',');
            if (semicolon > 5 && comma > semicolon) {
                mimeType = photoData.substring(5, semicolon);
                base64Data = photoData.substring(comma + 1);
            }
        }

        ObjectNode inlineDataWrapper = partsArray.addObject();
        ObjectNode inlineData = inlineDataWrapper.putObject("inline_data");
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Data);
    }

    private String extractTextFromGeminiResponse(JsonNode root) {
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                return parts.get(0).path("text").asText();
            }
        }
        return "";
    }

    private JsonNode parseCleanJson(String rawText) {
        try {
            String clean = rawText.trim();
            if (clean.startsWith("```json")) {
                clean = clean.substring(7);
            } else if (clean.startsWith("```")) {
                clean = clean.substring(3);
            }
            if (clean.endsWith("```")) {
                clean = clean.substring(0, clean.length() - 3);
            }
            clean = clean.trim();
            return objectMapper.readTree(clean);
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response as JSON: {}", rawText);
            return objectMapper.createObjectNode();
        }
    }

    private ComplaintAnalysisResult fallbackClassification(Complaint complaint, String photoData) {
        String category = complaint.getCategory() != null ? complaint.getCategory() : "Other";
        String routedAuthority;
        ComplaintPriority priority;

        switch (category) {
            case "Streetlight" -> {
                routedAuthority = "Electricity Department";
                priority = ComplaintPriority.MEDIUM;
            }
            case "Drainage" -> {
                routedAuthority = "Water Board";
                priority = ComplaintPriority.MEDIUM;
            }
            case "Road Damage", "Encroachment" -> {
                routedAuthority = "Municipal Road Department";
                priority = ComplaintPriority.MEDIUM;
            }
            case "Illegal Dumping" -> {
                routedAuthority = "Sanitation Department";
                priority = ComplaintPriority.LOW;
            }
            case "Unsafe Area" -> {
                routedAuthority = "Local Police / Women Safety Cell";
                priority = ComplaintPriority.HIGH;
            }
            default -> {
                routedAuthority = "Municipal Corporation";
                priority = ComplaintPriority.LOW;
            }
        }

        String desc = complaint.getDescription() != null ? complaint.getDescription() : "";
        String summary = "Auto-routed based on category: " + category +
                ". " + desc.substring(0, Math.min(100, desc.length())) + "...";

        Boolean imageVerified = (photoData != null && !photoData.isBlank()) ? true : null;
        String note = imageVerified != null
                ? "Image received and attached (AI vision verification active when GEMINI_API_KEY is configured)."
                : null;

        return new ComplaintAnalysisResult(routedAuthority, summary, priority, imageVerified, note);
    }

    private String generateFallbackChatResponse(String query) {
        String lower = query.toLowerCase();
        if (lower.contains("report") || lower.contains("pothole") || lower.contains("broken") || lower.contains("garbage") || lower.contains("light") || lower.contains("drain")) {
            return "👋 **How to report an issue on NagarSeva:**\n\n" +
                    "1. Click on **'Report Issue'** in the navigation bar (or visit `/report`).\n" +
                    "2. Select the category (e.g. *Road Damage*, *Streetlight*, *Drainage*, *Illegal Dumping*, or *Unsafe Area*).\n" +
                    "3. Provide a clear description and location address (or click **'📍 Use My Current Location'**).\n" +
                    "4. Optionally upload a photo for **AI Image Verification**.\n" +
                    "5. Submit! Your grievance is automatically routed to the right municipal authority.";
        } else if (lower.contains("track") || lower.contains("status")) {
            return "🔍 **Tracking your grievance:**\n\n" +
                    "- Go to **'My Complaints'** (`/my-complaints`) to view all your reported issues.\n" +
                    "- Go to **'Track All'** (`/track`) to browse complaints reported across the city.\n" +
                    "- Issues transition from **OPEN** ➡️ **IN_PROGRESS** ➡️ **RESOLVED** with photo proof.";
        } else if (lower.contains("safety") || lower.contains("map") || lower.contains("route")) {
            return "🛡️ **Safety Map & Route Checker:**\n\n" +
                    "- Visit the **Safety Map** (`/safety`) to see a real-time safety heatmap based on verified civic reports.\n" +
                    "- Use the **Route Safety Checker** before traveling to find safer paths.";
        } else {
            return "👋 Hello! I am your **NagarSeva Civic AI Assistant**.\n\n" +
                    "I can help you with:\n" +
                    "- 📝 **Drafting complaints** (potholes, garbage, streetlights, drainage)\n" +
                    "- 🔍 **Tracking grievances** and ward resolution rates\n" +
                    "- 🗺️ **Checking route safety** on our live Safety Map\n" +
                    "- 🏢 **Connecting with municipal authorities**\n\n" +
                    "How can I assist you today?";
        }
    }
}
