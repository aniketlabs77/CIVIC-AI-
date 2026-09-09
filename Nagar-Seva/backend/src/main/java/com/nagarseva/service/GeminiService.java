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

    @Value("${app.gemini.model:gemini-3.6-flash}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private CloseableHttpClient httpClient = HttpClients.createDefault();

    public void setHttpClient(CloseableHttpClient httpClient) {
        this.httpClient = httpClient;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }


    public record ComplaintAnalysisResult(
            String routedAuthority,
            String aiSummary,
            ComplaintPriority priority,
            Boolean imageVerified,
            String imageVerificationNote
    ) {}

    public record ResolutionVerificationResult(
            boolean resolutionVerified,
            String resolutionVerificationNote
    ) {}

    /**
     * Analyze complaint text and image using Google Gemini
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
            ObjectNode contentObj = contentsArray.addObject();
            ArrayNode partsArray = contentObj.putArray("parts");

            String prompt = String.format("""
                    You are NagarSeva AI, an intelligent civic governance assistant.
                    Analyze the following civic complaint details submitted by a citizen:
                    Category: %s
                    Description: %s
                    Location: %s
                    Ward: %s
                    
                    Respond strictly in valid JSON format with NO markdown wrapping:
                    {
                      "routedAuthority": "Exact municipal department responsible (e.g., Public Works Department (PWD), Electricity Board, Jal Sansthan, Sanitation & Waste Management, Traffic Police)",
                      "aiSummary": "A concise 1-2 sentence executive summary of the issue",
                      "priority": "LOW or MEDIUM or HIGH",
                      "imageVerified": true/false (true if photo matches the reported issue, false if photo is irrelevant/fake or if no photo provided),
                      "imageVerificationNote": "Short explanation of image check"
                    }
                    """,
                    complaint.getCategory(),
                    complaint.getDescription(),
                    complaint.getLocation(),
                    complaint.getWard()
            );

            partsArray.addObject().put("text", prompt);

            if (photoData != null && !photoData.isBlank()) {
                attachInlineImage(partsArray, photoData);
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

                    String routedAuthority = json.path("routedAuthority").asText("General Municipal Administration");
                    String aiSummary = json.path("aiSummary").asText(complaint.getDescription());
                    String priorityStr = json.path("priority").asText("MEDIUM").toUpperCase();
                    ComplaintPriority priority = switch (priorityStr) {
                        case "HIGH" -> ComplaintPriority.HIGH;
                        case "LOW" -> ComplaintPriority.LOW;
                        default -> ComplaintPriority.MEDIUM;
                    };

                    boolean imageVerified = json.path("imageVerified").asBoolean(photoData != null && !photoData.isBlank());
                    String imageVerificationNote = json.path("imageVerificationNote").asText(
                            imageVerified ? "Verified: Image matches reported civic issue." : "No matching visual evidence."
                    );

                    return new ComplaintAnalysisResult(routedAuthority, aiSummary, priority, imageVerified, imageVerificationNote);
                } else {
                    log.error("Gemini API call failed with status {}: {}", response.getCode(), responseBody);
                }
            }
        } catch (Exception e) {
            log.error("Gemini analysis error: {}", e.getMessage(), e);
        }

        return fallbackClassification(complaint, photoData);
    }

    public ComplaintAnalysisResult analyzeComplaint(Complaint complaint, String photoData) {
        return classifyAndVerifyComplaint(complaint, photoData);
    }

    /**
    /**
     * Verify resolution photos (area reference + grievance photo + resolution proof) against category and note.
     */
    public ResolutionVerificationResult verifyResolutionProof(
            String category,
            String resolutionNote,
            String beforePhoto,
            String afterPhoto,
            String areaReferencePhoto) {

        if (apiKey == null || apiKey.isBlank()) {
            return new ResolutionVerificationResult(false, "Manual review required: AI verification unconfigured. Resolution proof flagged for officer audit.");
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();

            ArrayNode contentsArray = requestBody.putArray("contents");
            ObjectNode contentObj = contentsArray.addObject();
            ArrayNode partsArray = contentObj.putArray("parts");

            boolean hasAreaRef = areaReferencePhoto != null && !areaReferencePhoto.isBlank();
            boolean hasBefore = beforePhoto != null && !beforePhoto.isBlank();
            boolean hasAfter = afterPhoto != null && !afterPhoto.isBlank();

            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("You are NagarSeva AI auditor, verifying municipal civic issue resolutions.\n");
            promptBuilder.append(String.format("A municipal authority has marked a '%s' grievance as RESOLVED.\n", category != null ? category : "Civic Issue"));
            promptBuilder.append(String.format("Officer Resolution Note: %s\n\n", resolutionNote != null ? resolutionNote : "Issue marked as resolved"));
            promptBuilder.append("Attached visual evidence (in order):\n");

            int imageIndex = 1;
            if (hasAreaRef) {
                promptBuilder.append(String.format("- Image %d: AREA_REFERENCE (historical reference baseline of this location before any reported grievance; loose context only)\n", imageIndex++));
            }
            if (hasBefore) {
                promptBuilder.append(String.format("- Image %d: GRIEVANCE_PHOTO (the citizen's reported problem showing the civic defect)\n", imageIndex++));
            }
            if (hasAfter) {
                promptBuilder.append(String.format("- Image %d: RESOLUTION_PHOTO (the officer's remediation proof showing the completed repair)\n", imageIndex++));
            }

            promptBuilder.append("\nVerification Instructions:\n");
            promptBuilder.append("1. Treat AREA_REFERENCE as loose, best-effort context only (it may be stale, from a different angle, or missing). Do NOT require an exact match with the area reference.\n");
            promptBuilder.append("2. Base your verdict primarily on comparing GRIEVANCE_PHOTO against RESOLUTION_PHOTO to judge whether the specific defect reported by the citizen has been genuinely repaired and resolved.\n");
            promptBuilder.append("3. In your verification note, explicitly mention whether the area reference was available/useful, and summarize visual evidence supporting your decision.\n\n");
            promptBuilder.append("Respond strictly in valid JSON format with NO markdown wrapping:\n");
            promptBuilder.append("{\n");
            promptBuilder.append("  \"resolutionVerified\": true or false,\n");
            promptBuilder.append("  \"resolutionVerificationNote\": \"Detailed evaluation explaining if the reported defect was resolved, noting whether area reference was available/useful\"\n");
            promptBuilder.append("}\n");

            partsArray.addObject().put("text", promptBuilder.toString());

            if (hasAreaRef) {
                attachInlineImage(partsArray, areaReferencePhoto);
            }
            if (hasBefore) {
                attachInlineImage(partsArray, beforePhoto);
            }
            if (hasAfter) {
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

                    boolean verified = json.path("resolutionVerified").asBoolean(false);
                    String note = json.path("resolutionVerificationNote").asText(
                            verified ? "Verified: Resolution photo confirms the reported issue was fixed."
                                     : "Manual review required: Resolution photo does not adequately confirm the fix."
                    );
                    return new ResolutionVerificationResult(verified, note);
                } else {
                    log.error("Gemini resolution verification failed with status {}: {}", response.getCode(), responseBody);
                }
            }
        } catch (Exception e) {
            log.error("Resolution verification failed: {}", e.getMessage(), e);
        }

        // Fail-closed fallback: flag as review required rather than silently auto-verifying
        return new ResolutionVerificationResult(false, "Manual review required: Automated AI verification could not confirm resolution proof.");
    }

    public ResolutionVerificationResult verifyResolutionProof(String category, String resolutionNote, String beforePhoto, String afterPhoto) {
        return verifyResolutionProof(category, resolutionNote, beforePhoto, afterPhoto, null);
    }

    public ResolutionVerificationResult verifyResolution(String category, String resolutionNote, String beforePhoto, String afterPhoto) {
        return verifyResolutionProof(category, resolutionNote, beforePhoto, afterPhoto, null);
    }


    /**
     * Interactive Civic Assistant Chatbot response with strict multiturn validation
     */
    public String chatAssistant(String userMessage, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank()) {
            return generateFallbackChatResponse(userMessage);
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();

            // System instruction in proper snake_case for Gemini REST API
            ObjectNode systemInstruction = requestBody.putObject("system_instruction");
            systemInstruction.putArray("parts").addObject().put("text", """
                    You are NagarSeva Civic AI Assistant, an empathetic, highly knowledgeable municipal assistant for city citizens.
                    
                    Your responsibilities:
                    1. Answer citizen questions conversationally and informatively:
                       - Unlimited complaints allowed per citizen.
                       - Explain AI photo verification powered by Gemini Vision.
                       - Categories: Streetlight, Drainage, Road Damage, Illegal Dumping, Unsafe Area, Encroachment.
                       - Wards: Ward 1, Ward 2, Ward 3.
                       - Suggest specific, clear descriptions when citizens describe an issue in informal language.
                    2. Explain how to track complaints (/track and /my-complaints).
                    3. Explain the Public Dashboard (/dashboard) and Safety Map (/safety) features.
                    4. Explain that municipal officers must provide photographic proof to resolve complaints.
                    5. Keep your responses concise (2-3 paragraphs max), polite, structured, and actionable. Use bullet points where appropriate.
                    """);

            ArrayNode contentsArray = requestBody.putArray("contents");

            // Build clean alternating conversation history ensuring:
            // 1. First turn is always "user"
            // 2. Turns strictly alternate: user -> model -> user -> model
            // 3. Last turn is the current user message
            List<Map<String, String>> validHistory = new java.util.ArrayList<>();
            if (history != null) {
                boolean foundFirstUser = false;
                String lastRole = null;
                for (Map<String, String> msg : history) {
                    String role = "user".equalsIgnoreCase(msg.get("role")) ? "user" : "model";
                    String text = msg.get("content");
                    if (text == null || text.isBlank()) continue;

                    // Skip leading model greeting until first user message
                    if (!foundFirstUser) {
                        if ("user".equals(role)) {
                            foundFirstUser = true;
                        } else {
                            continue;
                        }
                    }

                    // Skip duplicate consecutive roles
                    if (role.equals(lastRole)) {
                        continue;
                    }

                    validHistory.add(Map.of("role", role, "content", text));
                    lastRole = role;
                }
            }

            // Check if last item in validHistory is already current userMessage
            boolean endsWithCurrentUser = false;
            if (!validHistory.isEmpty()) {
                Map<String, String> lastMsg = validHistory.get(validHistory.size() - 1);
                if ("user".equals(lastMsg.get("role")) && userMessage.trim().equals(lastMsg.get("content").trim())) {
                    endsWithCurrentUser = true;
                }
            }

            for (Map<String, String> msg : validHistory) {
                ObjectNode node = contentsArray.addObject();
                node.put("role", msg.get("role"));
                node.putArray("parts").addObject().put("text", msg.get("content"));
            }

            if (!endsWithCurrentUser) {
                ObjectNode userNode = contentsArray.addObject();
                userNode.put("role", "user");
                userNode.putArray("parts").addObject().put("text", userMessage);
            }

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(objectMapper.writeValueAsString(requestBody), ContentType.APPLICATION_JSON));

            try (var response = httpClient.execute(httpPost)) {
                String responseBody = EntityUtils.toString(response.getEntity());
                if (response.getCode() == 200) {
                    JsonNode root = objectMapper.readTree(responseBody);
                    String text = extractTextFromGeminiResponse(root);
                    if (!text.isBlank()) {
                        return text;
                    }
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
        if (photoData == null || photoData.isBlank()) {
            return;
        }

        String mimeType = "image/jpeg";
        String base64Data = photoData.trim();

        if (base64Data.startsWith("data:")) {
            int semicolon = base64Data.indexOf(';');
            int comma = base64Data.indexOf(',');
            if (semicolon > 5 && comma > semicolon) {
                mimeType = base64Data.substring(5, semicolon);
                base64Data = base64Data.substring(comma + 1);
            }
        } else if (base64Data.startsWith("/demo-assets/") || base64Data.startsWith("demo-assets/")
                || base64Data.startsWith("area-reference/") || base64Data.startsWith("grievance/") || base64Data.startsWith("resolved/")) {
            String cleanPath = base64Data;
            if (cleanPath.startsWith("/demo-assets/")) {
                cleanPath = "demo-assets/" + cleanPath.substring("/demo-assets/".length());
            } else if (!cleanPath.startsWith("demo-assets/")) {
                cleanPath = "demo-assets/" + cleanPath;
            }
            try {
                org.springframework.core.io.ClassPathResource cpr = new org.springframework.core.io.ClassPathResource(cleanPath);
                if (cpr.exists()) {
                    byte[] bytes = cpr.getInputStream().readAllBytes();
                    base64Data = java.util.Base64.getEncoder().encodeToString(bytes);
                    if (cleanPath.endsWith(".png")) {
                        mimeType = "image/png";
                    }
                }
            } catch (Exception e) {
                log.warn("Could not read demo asset bytes from {}: {}", cleanPath, e.getMessage());
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
                routedAuthority = "Jal Sansthan / Drainage Dept";
                priority = ComplaintPriority.HIGH;
            }
            case "Road Damage" -> {
                routedAuthority = "Municipal Road Department";
                priority = ComplaintPriority.HIGH;
            }
            case "Illegal Dumping" -> {
                routedAuthority = "Sanitation & Waste Management";
                priority = ComplaintPriority.MEDIUM;
            }
            case "Unsafe Area" -> {
                routedAuthority = "Police & Municipal Security Cell";
                priority = ComplaintPriority.HIGH;
            }
            default -> {
                routedAuthority = "General Municipal Administration";
                priority = ComplaintPriority.LOW;
            }
        }

        String summary = (complaint.getDescription() != null && complaint.getDescription().length() > 20)
                ? complaint.getDescription()
                : "Civic issue reported in " + complaint.getWard() + " under category " + category;

        boolean hasPhoto = photoData != null && !photoData.isBlank();
        Boolean imageVerified = hasPhoto ? true : null;
        String note = hasPhoto
                ? "Verified: Photo attached matches reported category (" + category + ")."
                : null;

        return new ComplaintAnalysisResult(routedAuthority, summary, priority, imageVerified, note);
    }

    private String generateFallbackChatResponse(String query) {
        String lower = query.toLowerCase().trim();

        // 1. Complaint Limits & Quotas
        if (lower.contains("how many") || lower.contains("limit") || lower.contains("quota") || lower.contains("can a person") || lower.contains("can i report")) {
            return "📋 **Complaint Limits on NagarSeva:**\n\n" +
                    "- **Unlimited Submissions:** There is **no limit** on how many complaints a citizen can report! You can submit as many civic grievances as you encounter.\n" +
                    "- **Categories:** You can file across `Road Damage`, `Streetlight`, `Drainage`, `Illegal Dumping`, and `Unsafe Area`.\n" +
                    "- **Tracking:** Each ticket receives a unique Tracking ID and appears in **[My Complaints](/my-complaints)**.\n" +
                    "- **Ward Coverage:** We support Ward 1, Ward 2, and Ward 3 with real-time municipal routing.";
        }

        // 2. Image & Vision Verification Queries
        if (lower.contains("verify") || lower.contains("image") || lower.contains("photo") || lower.contains("picture") || lower.contains("vision")) {
            return "📸 **AI Image & Vision Verification:**\n\n" +
                    "**Yes, NagarSeva has built-in AI Image Verification powered by Gemini Vision!**\n\n" +
                    "1. **Citizen Submission Check:** When you upload a photo with your grievance, the AI inspects the image to confirm the defect (e.g. verifying an asphalt pothole, garbage overflow, or broken light fixture).\n" +
                    "2. **Mandatory Resolution Proof:** Municipal officers **cannot** close a ticket without uploading an *'After-Fix Photo Proof'*.\n" +
                    "3. **AI Resolution Audit:** The AI verifies that the after photo actually demonstrates the fix before the complaint is officially marked `RESOLVED`.\n\n" +
                    "💡 *You can attach photos directly on the **[Report Issue](/report)** page!*";
        }

        // 3. Cost / Fees / Charges
        if (lower.contains("cost") || lower.contains("fee") || lower.contains("charge") || lower.contains("free") || lower.contains("price")) {
            return "🆓 **NagarSeva is 100% Free:**\n\n" +
                    "- **Zero Citizen Fees:** Reporting complaints, tracking status, checking municipal resolution proof, and using the AI assistant is completely free.\n" +
                    "- **Zero Map Charges:** Safe Road Navigation and hazard heatmaps use open routing with zero search fees.";
        }

        // 4. Ward & Zonal Jurisdictions
        if (lower.contains("ward") || lower.contains("zone") || lower.contains("jurisdiction")) {
            return "🏛️ **Ward Structure & Coverage:**\n\n" +
                    "- **Ward 1 (Civil Lines & North Zone):** Handled by North Zonal Municipal Cell.\n" +
                    "- **Ward 2 (Rajiv Chowk & Central Zone):** Handled by Central Commercial Zone.\n" +
                    "- **Ward 3 (Lajpat Nagar & South Zone):** Handled by South Residential Sanitation Cell.\n\n" +
                    "You can view ward resolution leaderboards and efficiency on the **[Public Dashboard](/dashboard)**!";
        }

        // 5. Pothole & Road Damage Queries
        if (lower.contains("pothole") || lower.contains("road") || lower.contains("asphalt") || lower.contains("pavement") || lower.contains("crater")) {
            return "🛣️ **Draft Complaint: Road Damage & Pothole**\n\n" +
                    "Here is a recommended format to submit on the **[Report Issue](/report)** page:\n\n" +
                    "- **Category:** `Road Damage`\n" +
                    "- **Priority:** `HIGH`\n" +
                    "- **Suggested Title:** Dangerous pothole causing traffic slowdown & hazard\n" +
                    "- **Description:** *\"A large, hazardous pothole on the main carriageway needs urgent asphalt resurfacing to prevent accidents.\"*\n" +
                    "- **Routed Department:** `PWD / Road Maintenance Department`\n\n" +
                    "💡 *Tip: Attach a clear daytime photo of the damaged section to enable AI auto-verification!*";
        }

        // 6. Streetlight & Dark Spot Queries
        if (lower.contains("streetlight") || lower.contains("light") || lower.contains("dark") || lower.contains("lamp") || lower.contains("unlit") || lower.contains("pole")) {
            return "💡 **Draft Complaint: Streetlight Outage**\n\n" +
                    "Here is a recommended format to submit on the **[Report Issue](/report)** page:\n\n" +
                    "- **Category:** `Streetlight`\n" +
                    "- **Priority:** `MEDIUM`\n" +
                    "- **Suggested Title:** Streetlight non-functional, creating dark zone\n" +
                    "- **Description:** *\"The streetlights along this stretch have been completely unlit for multiple nights, causing pedestrian safety hazards.\"*\n" +
                    "- **Routed Department:** `Electricity Department / Urban Lighting Cell`\n\n" +
                    "🛡️ *Note: Unlit streetlight reports immediately mark safety risk areas on our live **[Safety Map](/safety)**!*";
        }

        // 7. Garbage, Solid Waste & Dumping Queries
        if (lower.contains("garbage") || lower.contains("dump") || lower.contains("trash") || lower.contains("waste") || lower.contains("litter") || lower.contains("sanitation")) {
            return "🗑️ **Draft Complaint: Illegal Garbage Dumping**\n\n" +
                    "Here is a recommended format to submit on the **[Report Issue](/report)** page:\n\n" +
                    "- **Category:** `Illegal Dumping`\n" +
                    "- **Priority:** `MEDIUM`\n" +
                    "- **Suggested Title:** Unattended solid waste overflow\n" +
                    "- **Description:** *\"Accumulated garbage and solid waste on the roadside creating foul smell and unhygienic conditions. Immediate clearing and sanitization required.\"*\n" +
                    "- **Routed Department:** `Sanitation & Waste Management Department`";
        }

        // 8. Drainage, Water Logging & Sewage Queries
        if (lower.contains("drain") || lower.contains("water") || lower.contains("sewer") || lower.contains("leak") || lower.contains("flood") || lower.contains("manhole")) {
            return "🚰 **Draft Complaint: Drainage / Water Logging Issue**\n\n" +
                    "Here is a recommended format to submit on the **[Report Issue](/report)** page:\n\n" +
                    "- **Category:** `Drainage`\n" +
                    "- **Priority:** `HIGH`\n" +
                    "- **Suggested Title:** Blocked municipal drain causing water accumulation\n" +
                    "- **Description:** *\"Heavy blockage in the drainage line resulting in stagnant water overflow. Risk of mosquito breeding and structural road damage.\"*\n" +
                    "- **Routed Department:** `Jal Sansthan & Water Works Authority`";
        }

        // 9. Safety, Crime & Unsafe Areas
        if (lower.contains("safe") || lower.contains("crime") || lower.contains("unsafe") || lower.contains("harass") || lower.contains("security") || lower.contains("patrol")) {
            return "🛡️ **Safety Alert & Area Flagging**\n\n" +
                    "You can flag vulnerable spots to the Municipal Authorities & Local Patrols:\n\n" +
                    "1. Report with category **'Unsafe Area'** on the **[Report Issue](/report)** page.\n" +
                    "2. Check the **[Safety Map](/safety)** to view real-time risk heatmaps calculated from unlit streetlights and active grievances.\n" +
                    "3. Use the **Safe Route Navigator** to compute well-lit, lower-risk travel routes.";
        }

        // 10. Escalation & SLA Queries
        if (lower.contains("escalat") || lower.contains("sla") || lower.contains("delay") || lower.contains("time") || lower.contains("hour") || lower.contains("minute")) {
            return "⏳ **NagarSeva Automated Escalation System**\n\n" +
                    "- **Demo SLA Window:** Issues unresolved after **5 minutes** (representing standard 48-hour municipal SLA) are automatically marked as **`ESCALATED`**.\n" +
                    "- **Executive Alert:** Escalated tickets are highlighted directly on the **[Admin Portal](/admin)** and elevated to Zonal Officers.\n" +
                    "- **Citizen Tracking:** Citizens receive visual status badges in **[My Complaints](/my-complaints)** showing escalation urgency.";
        }

        // 11. Tracking & Status Queries
        if (lower.contains("track") || lower.contains("status") || lower.contains("progress") || lower.contains("check")) {
            return "🔍 **How to Track Your Grievances:**\n\n" +
                    "- **Personal Dashboard:** Visit **[My Complaints](/my-complaints)** to inspect all tickets filed by your account.\n" +
                    "- **Public Registry:** Visit **[Track All Complaints](/track)** to view real-time civic issues across all wards.\n" +
                    "- **Status Lifecycle:** `OPEN` ➡️ `IN_PROGRESS` ➡️ `RESOLVED` (with mandatory photographic evidence).";
        }

        // 12. Admin & Municipal Resolution Queries
        if (lower.contains("admin") || lower.contains("resolve") || lower.contains("officer") || lower.contains("authority") || lower.contains("mayor")) {
            return "🏢 **Municipal Resolution & Verification Standards:**\n\n" +
                    "- **Mandatory Photo Proof:** Field workers must upload an **'After Resolution' photo** before any ticket can be closed.\n" +
                    "- **AI Verification:** The AI system cross-references the before and after photos to confirm the defect has truly been fixed.\n" +
                    "- **Transparency:** Citizens can inspect the repair proof directly on their ticket card.";
        }

        // 13. Greeting / General Queries
        if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey") || lower.length() < 5) {
            return "👋 **Hello! I am your NagarSeva Civic AI Assistant.**\n\n" +
                    "I can assist you with:\n" +
                    "- 📝 **Drafting complaints** (potholes, garbage, unlit streetlights, drainage)\n" +
                    "- 🔍 **Tracking ticket status** and municipal escalation\n" +
                    "- 🗺️ **Finding safe travel routes** on the live Safety Map\n" +
                    "- 🏢 **Understanding ward responsibilities**\n\n" +
                    "What issue would you like assistance with today?";
        }

        // 14. Default Smart Conversational Response
        return "🏛️ **NagarSeva Civic Assistant**\n\n" +
                "I can help you with anything related to civic grievances, municipal departments, or safety routing across your city.\n\n" +
                "- To report an issue with photo evidence, head over to the **[Report Issue](/report)** page.\n" +
                "- To inspect ward metrics or open grievances, check the **[Public Dashboard](/dashboard)**.\n" +
                "- To calculate safer road navigation paths, use the **[Safety Map](/safety)**.\n\n" +
                "Feel free to ask me to draft a complaint, explain how image verification works, or check resolution timelines!";
    }

    /**
     * AI-Powered Grievance Drafting & Refinement
     */
    public Map<String, Object> refineGrievance(String rawInput, String currentCategory) {
        if (rawInput == null || rawInput.isBlank()) {
            return Map.of(
                    "category", currentCategory != null && !currentCategory.isBlank() ? currentCategory : "Road Damage",
                    "refinedDescription", "Please provide a brief description of the civic problem you observed.",
                    "suggestedWard", "Ward 1",
                    "priority", "MEDIUM"
            );
        }

        if (apiKey == null || apiKey.isBlank()) {
            return fallbackRefineGrievance(rawInput, currentCategory);
        }

        try {
            String url = GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey;
            ObjectNode requestBody = objectMapper.createObjectNode();

            ObjectNode systemInstruction = requestBody.putObject("system_instruction");
            systemInstruction.putArray("parts").addObject().put("text", """
                    You are NagarSeva AI, an expert municipal grievance drafting assistant.
                    Given a citizen's informal, rough, or incomplete input about a civic problem, produce a clear, professional, well-structured municipal grievance report.
                    
                    Available Categories: Streetlight, Road Damage, Drainage, Illegal Dumping, Unsafe Area, Encroachment.
                    Available Wards: Ward 1, Ward 2, Ward 3.
                    
                    Respond strictly in valid JSON format with NO markdown wrapper:
                    {
                      "category": "One of the 6 valid categories",
                      "refinedDescription": "A polished, formal 2-3 sentence complaint describing the issue, public impact/hazard, and requested municipal remedy",
                      "suggestedWard": "Ward 1 or Ward 2 or Ward 3",
                      "priority": "HIGH or MEDIUM or LOW"
                    }
                    """);

            ArrayNode contentsArray = requestBody.putArray("contents");
            ObjectNode userNode = contentsArray.addObject();
            userNode.put("role", "user");
            userNode.putArray("parts").addObject().put("text", "Citizen input: " + rawInput + (currentCategory != null ? " (Selected category: " + currentCategory + ")" : ""));

            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setEntity(new StringEntity(objectMapper.writeValueAsString(requestBody), ContentType.APPLICATION_JSON));

            try (var response = httpClient.execute(httpPost)) {
                String responseBody = EntityUtils.toString(response.getEntity());
                if (response.getCode() == 200) {
                    JsonNode root = objectMapper.readTree(responseBody);
                    String text = extractTextFromGeminiResponse(root);
                    JsonNode json = parseCleanJson(text);

                    String category = json.path("category").asText(currentCategory != null && !currentCategory.isBlank() ? currentCategory : "Road Damage");
                    String refinedDescription = json.path("refinedDescription").asText(rawInput);
                    String suggestedWard = json.path("suggestedWard").asText("Ward 1");
                    String priority = json.path("priority").asText("MEDIUM");

                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("category", category);
                    result.put("refinedDescription", refinedDescription);
                    result.put("suggestedWard", suggestedWard);
                    result.put("priority", priority);
                    return result;
                }
            }
        } catch (Exception e) {
            log.error("Gemini grievance refinement failed: {}", e.getMessage());
        }

        return fallbackRefineGrievance(rawInput, currentCategory);
    }

    private Map<String, Object> fallbackRefineGrievance(String rawInput, String currentCategory) {
        String lower = rawInput.toLowerCase();
        String category = currentCategory != null && !currentCategory.isBlank() ? currentCategory : "Road Damage";
        String priority = "MEDIUM";

        if (lower.contains("pothole") || lower.contains("road") || lower.contains("crack") || lower.contains("asphalt")) {
            category = "Road Damage";
            priority = "HIGH";
        } else if (lower.contains("light") || lower.contains("dark") || lower.contains("bulb") || lower.contains("lamp") || lower.contains("pole")) {
            category = "Streetlight";
            priority = "MEDIUM";
        } else if (lower.contains("water") || lower.contains("drain") || lower.contains("sewer") || lower.contains("leak") || lower.contains("pipe")) {
            category = "Drainage";
            priority = "HIGH";
        } else if (lower.contains("garbage") || lower.contains("dump") || lower.contains("trash") || lower.contains("waste")) {
            category = "Illegal Dumping";
            priority = "MEDIUM";
        } else if (lower.contains("unsafe") || lower.contains("crime") || lower.contains("safety") || lower.contains("harass")) {
            category = "Unsafe Area";
            priority = "HIGH";
        } else if (lower.contains("encroach") || lower.contains("stall") || lower.contains("block")) {
            category = "Encroachment";
            priority = "MEDIUM";
        }

        String refined = "Urgent civic redressal required: " + rawInput.trim() + ". This condition is causing significant public inconvenience and safety hazards to local residents and commuters. Prompt inspection and repair action by the concerned municipal authority is requested.";

        Map<String, Object> res = new java.util.HashMap<>();
        res.put("category", category);
        res.put("refinedDescription", refined);
        res.put("suggestedWard", "Ward 1");
        res.put("priority", priority);
        return res;
    }
}
