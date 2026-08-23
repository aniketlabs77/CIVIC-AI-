package com.nagarseva.service;

import com.nagarseva.entity.User;
import com.nagarseva.entity.UserRole;
import com.nagarseva.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testFindOrCreateNewCitizen() {
        String uid = "test-new-uid-12345";
        String email = "newcitizen@example.com";

        User user = userService.findOrCreateByFirebaseUid(uid, email);

        assertNotNull(user.getId());
        assertEquals(uid, user.getFirebaseUid());
        assertEquals(email, user.getEmail());
        assertEquals(UserRole.CITIZEN, user.getRole());
        assertNotNull(user.getCreatedAt());
        assertNotNull(user.getLastLoginAt());

        // Subsequent call should retrieve the same user
        User existingUser = userService.findOrCreateByFirebaseUid(uid, email);
        assertEquals(user.getId(), existingUser.getId());
    }

    @Test
    public void testLinkExistingAdminByEmail() {
        // Find pre-seeded admin user
        Optional<User> adminOpt = userRepository.findByEmail("admin@nagarseva.com");
        assertTrue(adminOpt.isPresent(), "Pre-seeded admin should exist");
        User initialAdmin = adminOpt.get();
        assertEquals(UserRole.ADMIN, initialAdmin.getRole());

        String adminUid = "firebase-admin-uid-999";
        User loggedInAdmin = userService.findOrCreateByFirebaseUid(adminUid, "admin@nagarseva.com");

        assertEquals(initialAdmin.getId(), loggedInAdmin.getId());
        assertEquals(adminUid, loggedInAdmin.getFirebaseUid());
        assertEquals(UserRole.ADMIN, loggedInAdmin.getRole(), "Role must be preserved as ADMIN");
    }
}
