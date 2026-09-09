package com.nagarseva.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates mandatory environment variables when running in production profile.
 * Fails fast on application startup if any required secret/configuration is missing.
 */
@Component
@Profile("prod")
public class ProdEnvironmentValidator {

    private static final Logger log = LoggerFactory.getLogger(ProdEnvironmentValidator.class);

    @Autowired
    private Environment environment;

    @PostConstruct
    public void validateProdEnvironment() {
        List<String> missingConfigs = new ArrayList<>();

        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            missingConfigs.add("DATABASE_URL");
        }

        String firebasePath = environment.getProperty("FIREBASE_CREDENTIALS_PATH");
        if (firebasePath == null || firebasePath.isBlank()) {
            missingConfigs.add("FIREBASE_CREDENTIALS_PATH");
        }

        String geminiApiKey = environment.getProperty("GEMINI_API_KEY");
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            missingConfigs.add("GEMINI_API_KEY");
        }

        if (!missingConfigs.isEmpty()) {
            String errorMsg = String.format(
                    "FATAL: Production startup aborted! Missing required environment variable(s): %s. " +
                    "Please configure them in the production environment before launching.",
                    String.join(", ", missingConfigs)
            );
            log.error(errorMsg);
            throw new IllegalStateException(errorMsg);
        }

        log.info("Production environment verified: DATABASE_URL, FIREBASE_CREDENTIALS_PATH, and GEMINI_API_KEY are configured.");
    }
}
