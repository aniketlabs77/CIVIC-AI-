# Local Email Notifications (MailHog)

NagarSeva uses email notifications to alert citizens and authorities about grievance updates. To verify and test these notifications locally without a real SMTP provider, you can use **MailHog**.

## Setup Instructions

1. **Run MailHog via Docker**
   Open your terminal and run the following command to start MailHog:
   ```bash
   docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
   ```
   *Note: Port 1025 is for the SMTP server, and port 8025 is for the web UI.*

2. **Verify Configuration**
   The application is already configured in `backend/src/main/resources/application-dev.properties` to connect to MailHog by default when running locally:
   ```properties
   spring.mail.host=localhost
   spring.mail.port=1025
   ```

3. **View Emails**
   Trigger an action that sends an email (e.g., updating a complaint's status to RESOLVED as an Admin).
   Then, open your browser and navigate to:
   [http://localhost:8025](http://localhost:8025)
   
   You will see the emails successfully intercepted by MailHog.

4. **Verify Logs**
   The backend will also log notifications to the console so that you can verify they were processed:
   ```text
   NOTIFICATION_SENT complaintId=123 to=citizen@nagarseva.com status=RESOLUTION_CONFIRMED
   ```
   If a user has disabled notifications, you will see a log stating it was skipped:
   ```text
   NOTIFICATION_SKIPPED complaintId=123 to=citizen@nagarseva.com status=RESOLUTION_CONFIRMED reason="User disabled notifications"
   ```
