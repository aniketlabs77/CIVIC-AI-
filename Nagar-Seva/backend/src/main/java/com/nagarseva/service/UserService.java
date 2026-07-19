package com.nagarseva.service;

import com.nagarseva.entity.User;
import com.nagarseva.entity.UserRole;
import com.nagarseva.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User register(User user) {
        // Check if email already exists
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already registered");
        }
        // Encode password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public Optional<User> login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                user.setLastLoginAt(LocalDateTime.now());
                userRepository.save(user);
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Seed default users if database is empty
        if (userRepository.count() == 0) {
            log.info("Seeding default users...");
            
            // Admin user
            User admin = new User("admin@nagarseva.com", "admin123", UserRole.ADMIN, "Admin User");
            admin.setPassword(passwordEncoder.encode("admin123"));
            userRepository.save(admin);
            
            // Citizen user
            User citizen = new User("citizen@nagarseva.com", "citizen123", UserRole.CITIZEN, "Citizen User");
            citizen.setPassword(passwordEncoder.encode("citizen123"));
            userRepository.save(citizen);
            
            log.info("Seeded default users: admin@nagarseva.com / admin123 (ADMIN) and citizen@nagarseva.com / citizen123 (CITIZEN)");
        }
    }
}