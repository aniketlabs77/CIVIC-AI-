package com.nagarseva.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${app.firebase.service-account-path:}")
    private String serviceAccountPath;

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            log.info("FirebaseApp already initialized.");
            return FirebaseApp.getInstance();
        }

        try {
            FirebaseOptions options = null;

            // 1. Check if explicit service account file path is configured
            if (serviceAccountPath != null && !serviceAccountPath.isBlank()) {
                File file = new File(serviceAccountPath);
                if (file.exists()) {
                    try (InputStream serviceAccount = new FileInputStream(file)) {
                        options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                .build();
                        log.info("Initialized FirebaseApp with service account file from: {}", serviceAccountPath);
                    }
                } else {
                    log.warn("Firebase service account file not found at path: {}. Attempting application default credentials.", serviceAccountPath);
                }
            }

            // 2. If not found via path, try application default credentials or classpath resource
            if (options == null) {
                try {
                    options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.getApplicationDefault())
                            .build();
                    log.info("Initialized FirebaseApp with Google Application Default Credentials.");
                } catch (Exception e) {
                    log.warn("Google Application Default Credentials not available ({})", e.getMessage());
                }
            }

            // 3. Fallback for development/testing without real credentials
            if (options == null) {
                log.warn("==========================================================================");
                log.warn("No Firebase credentials provided. Firebase Admin SDK initialized with empty");
                log.warn("options for development/testing. Provide FIREBASE_CREDENTIALS_PATH for auth.");
                log.warn("==========================================================================");
                options = FirebaseOptions.builder()
                        .setProjectId("nagarseva-app")
                        .build();
            }

            return FirebaseApp.initializeApp(options);
        } catch (Exception e) {
            log.error("Failed to initialize FirebaseApp: {}", e.getMessage(), e);
            return null;
        }
    }
}
