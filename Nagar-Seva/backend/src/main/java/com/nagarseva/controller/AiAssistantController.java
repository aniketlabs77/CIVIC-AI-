package com.nagarseva.controller;

import com.nagarseva.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {

    @Autowired
    private GeminiService geminiService;

    public record ChatRequest(String message, List<Map<String, String>> history) {}
    public record ChatResponse(String reply) {}

    public record RefineGrievanceRequest(String input, String category) {}

    /**
     * POST /api/ai/chat - Civic AI Assistant chatbot endpoint
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAssistant(@RequestBody ChatRequest request) {
        if (request.message() == null || request.message().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        String reply = geminiService.chatAssistant(request.message(), request.history());
        return ResponseEntity.ok(new ChatResponse(reply));
    }

    /**
     * POST /api/ai/refine-grievance - AI-assisted grievance drafting & optimization
     */
    @PostMapping("/refine-grievance")
    public ResponseEntity<?> refineGrievance(@RequestBody RefineGrievanceRequest request) {
        if (request.input() == null || request.input().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Input cannot be empty"));
        }

        Map<String, Object> refined = geminiService.refineGrievance(request.input(), request.category());
        return ResponseEntity.ok(refined);
    }
}
