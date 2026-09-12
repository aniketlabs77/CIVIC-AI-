package com.nagarseva.service;

import com.nagarseva.entity.Complaint;
import com.nagarseva.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.MailSendException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private MimeMessage mimeMessage;

    @InjectMocks
    private NotificationService notificationService;

    private Complaint complaint;
    private User citizen;

    @BeforeEach
    void setUp() {
        citizen = new User();
        citizen.setId(1L);
        citizen.setEmail("citizen@example.com");
        citizen.setNotificationsEnabled(true);

        complaint = new Complaint();
        complaint.setId(100L);
        complaint.setCitizen(citizen);
        complaint.setCategory("Pothole");
        complaint.setRoutedAuthority("PWD");
    }

    @Test
    void testSendResolutionEmail_NotificationsEnabled() {
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        notificationService.sendResolutionEmail(complaint);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void testSendResolutionEmail_NotificationsDisabled() {
        citizen.setNotificationsEnabled(false);

        notificationService.sendResolutionEmail(complaint);

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void testSendResolutionEmail_SmtpFailureDoesNotThrow() {
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP server unreachable")).when(mailSender).send(any(MimeMessage.class));

        // Should not throw
        notificationService.sendResolutionEmail(complaint);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
