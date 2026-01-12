package com.email.writer_;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final String apiKey;

    public EmailGeneratorService(WebClient.Builder webClientBuilder,
                                 @Value("${gemini.api.url}") String baseUrl,
                                 @Value("${gemini.api.key}") String geminiApiKey) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = geminiApiKey;
    }

    public String generateEmailReply(EmailRequest emailRequest) {
        try {
            if (emailRequest.getEmailContent() == null || emailRequest.getEmailContent().trim().isEmpty()) {
                return "Error: Email content is empty. Please provide a valid email.";
            }

            // Build prompt
            String prompt = buildPrompt(emailRequest);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt)
                            ))
                    )
            );

            // Call Gemini API
            String response = webClient.post()
                    .uri("/v1beta/models/gemini-2.5-flash:generateContent")
                    .header("X-goog-api-key", apiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response == null || response.isEmpty()) {
                return "Error: Received empty response from Gemini API";
            }

            return extractResponseContentSafe(response);

        } catch (Exception e) {
            e.printStackTrace();
            return "Error: Failed to generate AI reply - " + e.getMessage();
        }
    }

    private String extractResponseContentSafe(String response) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            JsonNode candidate = root.path("candidates").get(0);
            if (candidate.isMissingNode()) return "Error: No candidates returned by Gemini API";

            JsonNode parts = candidate.path("content").path("parts").get(0);
            if (parts.isMissingNode()) return "Error: Gemini API response has no text parts";

            return parts.path("text").asText();

        } catch (JsonProcessingException e) {
            return "Error: Failed to parse Gemini API response";
        }
    }

    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a professional, good-length email reply (without subject line) for the following email. ");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("Use a ").append(emailRequest.getTone()).append(" tone. ");
        }

        // Remove "Subject:" line if present
        String cleanContent = emailRequest.getEmailContent()
                .replaceAll("(?i)^Subject:.*\\n?", "");

        prompt.append("\nOriginal Email:\n").append(cleanContent);
        return prompt.toString();
    }
}
