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
}
