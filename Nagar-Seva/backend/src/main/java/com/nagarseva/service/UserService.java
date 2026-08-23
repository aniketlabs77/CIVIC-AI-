package com.nagarseva.service;

import com.nagarseva.entity.User;
import com.nagarseva.entity.UserRole;
import com.nagarseva.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByFirebaseUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public User findOrCreateByFirebaseUid(String firebaseUid, String email) {
        if (firebaseUid == null || firebaseUid.isBlank()) {
            throw new IllegalArgumentException("Firebase UID cannot be empty");
        }

        // 1. Check if user already exists by firebaseUid
        Optional<User> userOpt = userRepository.findByFirebaseUid(firebaseUid);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setLastLoginAt(LocalDateTime.now());
            if (email != null && !email.isBlank() && (user.getEmail() == null || user.getEmail().isBlank())) {
                user.setEmail(email);
            }
            return userRepository.save(user);
        }

        // 2. Check if a user with this email already exists (e.g. pre-seeded admin/citizen)
        if (email != null && !email.isBlank()) {
            Optional<User> existingByEmail = userRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                User user = existingByEmail.get();
                user.setFirebaseUid(firebaseUid);
                user.setLastLoginAt(LocalDateTime.now());
                log.info("Linked existing user {} ({}) to Firebase UID {}", user.getEmail(), user.getRole(), firebaseUid);
                return userRepository.save(user);
            }
        }

        // 3. Create a new CITIZEN user
        User newUser = new User();
        newUser.setFirebaseUid(firebaseUid);
        String resolvedEmail = (email != null && !email.isBlank()) ? email : (firebaseUid + "@firebase.user");
        newUser.setEmail(resolvedEmail);
        newUser.setRole(UserRole.CITIZEN);
        String defaultName = resolvedEmail.contains("@") ? resolvedEmail.substring(0, resolvedEmail.indexOf('@')) : "Citizen";
        newUser.setName(defaultName);
        newUser.setCreatedAt(LocalDateTime.now());
        newUser.setLastLoginAt(LocalDateTime.now());

        log.info("Created new CITIZEN user for Firebase UID {} ({})", firebaseUid, resolvedEmail);
        return userRepository.save(newUser);
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Seed default users if database is empty
        if (userRepository.count() == 0) {
            log.info("Seeding default users...");
            
            // Admin user (role: ADMIN)
            User admin = new User("admin@nagarseva.com", UserRole.ADMIN, "Admin User");
            userRepository.save(admin);
            
            // Citizen user (role: CITIZEN)
            User citizen = new User("citizen@nagarseva.com", UserRole.CITIZEN, "Citizen User");
            userRepository.save(citizen);
            
            log.info("Seeded default users: admin@nagarseva.com (ADMIN) and citizen@nagarseva.com (CITIZEN)");
        }
    }
}