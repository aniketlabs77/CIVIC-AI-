# NagarSeva Backend - Spring Boot REST API

Civic grievance reporting platform backend built with Spring Boot 3.x, Spring Security, Firebase Admin SDK, and Maven.

## Prerequisites

- **Java**: 17 or higher
- **Maven**: 3.6 or higher
- **Firebase Project**: (for Firebase Authentication & Admin SDK verification)

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/nagarseva/
│   │   │   ├── NagarSevaApplication.java       # Main entry point
│   │   │   ├── config/
│   │   │   │   ├── CorsConfig.java             # CORS configuration
│   │   │   │   ├── FirebaseConfig.java         # FirebaseApp initialization
│   │   │   │   ├── FirebaseAuthFilter.java     # ID token verification filter
│   │   │   │   ├── GlobalExceptionHandler.java # REST exception handling
│   │   │   │   └── SecurityConfig.java         # Spring Security & route authorization
│   │   │   ├── controller/
│   │   │   │   ├── AdminController.java        # Protected admin endpoints (ROLE_ADMIN)
│   │   │   │   ├── AuthController.java         # Authenticated user profile (/api/auth/me)
│   │   │   │   ├── ComplaintController.java    # Grievance CRUD & citizen actions
│   │   │   │   ├── DashboardController.java    # Public dashboard statistics
│   │   │   │   └── SafetyController.java       # Public safety heatmap & route checks
│   │   │   ├── entity/
│   │   │   │   ├── Complaint.java              # Complaint JPA entity
│   │   │   │   ├── ComplaintPriority.java      # LOW / MEDIUM / HIGH
│   │   │   │   ├── ComplaintStatus.java        # OPEN / IN_PROGRESS / RESOLVED / ESCALATED
│   │   │   │   ├── User.java                   # User JPA entity with firebaseUid & role
│   │   │   │   └── UserRole.java               # CITIZEN / ADMIN
│   │   │   ├── repository/
│   │   │   │   ├── ComplaintRepository.java    # JPA repository for complaints
│   │   │   │   └── UserRepository.java         # JPA repository for users (by firebaseUid/email)
│   │   │   └── service/
│   │   │       ├── ComplaintService.java       # Complaint business logic, AI routing & escalation
│   │   │       └── UserService.java            # User management & Firebase UID linking
│   │   └── resources/
│   │       └── application.properties          # Server & database configuration
│   └── test/
└── pom.xml                                     # Maven dependencies
```

## Authentication & Security

NagarSeva uses **Firebase Authentication** on the client side and verifies ID tokens server-side using the **Firebase Admin SDK**.

### How Authentication Works:
1. The frontend authenticates users with Firebase (Email/Password).
2. For each API request, `apiClient` attaches the Firebase ID token in `Authorization: Bearer <idToken>`.
3. `FirebaseAuthFilter` intercepts requests:
   - Verifies the ID token with `FirebaseAuth.getInstance().verifyIdToken(token)`.
   - Looks up or creates the corresponding `User` record via `UserService.findOrCreateByFirebaseUid(uid, email)`.
   - Populates Spring Security's `SecurityContext` with the user's role authority (`ROLE_CITIZEN` or `ROLE_ADMIN`).
4. `SecurityConfig` enforces role-based access control.

---

## AI Engine: Google Gemini (Multimodal Vision & NLP)

NagarSeva uses **Google Gemini (`gemini-1.5-flash`)** as a unified AI engine for:

1. **Multimodal Grievance Image Verification**:
   - Analyzes photos submitted by citizens alongside the grievance description.
   - Evaluates if the photo depicts an authentic civic issue matching the selected category.
   - Automatically sets `imageVerified: true/false` and produces an `imageVerificationNote`.
   - Flags fake, meme, or unrelated photos for municipal review.
2. **AI-Powered Department Routing & Priority**:
   - Automatically classifies the grievance to the right department (*Electricity*, *Water Board*, *Municipal Road Dept*, *Sanitation*, *Police / Women Safety Cell*).
   - Assigns priority (`LOW`, `MEDIUM`, `HIGH`) and generates a concise executive `aiSummary`.
3. **Resolution Proof Verification**:
   - When municipal staff submit a resolution photo, Gemini analyzes the image to confirm the repair has been executed before updating resolution records.
4. **NagarSeva Civic AI Assistant (Chatbot)**:
   - Floating interactive assistant on the website powered by `POST /api/ai/chat`.
   - Assists citizens in drafting well-formatted complaints, understanding ward rules, checking safety routes, and navigating the web application.

---

## Configuration & Environment Variables

| Property / Env Variable | Description | Default |
|-------------------------|-------------|---------|
| `GEMINI_API_KEY` / `app.gemini.api-key` | Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/) | *(Optional, uses rule-based fallback if unset)* |
| `GEMINI_MODEL` / `app.gemini.model` | Gemini model name | `gemini-1.5-flash` |
| `FIREBASE_CREDENTIALS_PATH` / `app.firebase.service-account-path` | Absolute path to the Firebase Service Account JSON file | *(Empty / Development fallback)* |
| `FRONTEND_URL` / `app.cors.allowed-origins` | Allowed CORS origins for browser clients | `http://localhost:5173,http://localhost:3000` |
| `DATABASE_URL` / `spring.datasource.url` | Database connection URL (PostgreSQL in production, H2 in dev) | `jdbc:h2:mem:nagarsevadb` |
| `PORT` / `server.port` | Server HTTP port | `8080` |

---

## Google Gemini API Key Setup (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and create a new key.
3. Add it to your environment variables or in `application.properties`:
   ```bash
   export GEMINI_API_KEY=your_gemini_api_key_here
   ```
*(Note: If no API key is configured, the backend automatically uses graceful offline fallback routing without crashing).*

---

## Firebase Setup Instructions (TODOs for Production / Staging)

1. **Create a Firebase Project**:
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Click **Add Project** and create a project (e.g. `nagarseva-app`).
2. **Enable Email/Password Authentication**:
   - Under **Build > Authentication**, go to the **Sign-in method** tab.
   - Enable **Email/Password** provider and save.
3. **Generate Service Account Key for Backend**:
   - Go to **Project Settings (gear icon) > Service accounts**.
   - Click **Generate new private key** and download the `.json` file.
   - Store this file securely (e.g., `serviceAccountKey.json`).
   - Set the path in environment variable or `application.properties`:
     ```bash
     export FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
     ```
4. **Configure Web App for Frontend**:
   - In **Project Settings > General > Your apps**, register a Web app.
   - Copy the `firebaseConfig` keys into `frontend/.env.local` (see `frontend/.env.example`).

---

## Setup & Running Locally

### 1. Build the project

```bash
mvn clean compile
```

### 2. Run the application

```bash
mvn spring-boot:run
```

The API will start on `http://localhost:8080`.

### 3. Access H2 Console

Navigate to `http://localhost:8080/h2-console`
- **JDBC URL**: `jdbc:h2:mem:nagarsevadb`
- **Username**: `sa`
- **Password**: *(leave empty)*

---

## API Endpoints & Access Control

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | NagarSeva Civic AI Assistant conversational endpoint |
| GET | `/api/dashboard/stats` | Aggregated civic complaint statistics |
| GET | `/api/safety/heatmap` | Safety heatmap coordinates and risk ratings |
| GET | `/api/safety/route-check` | Real-time path safety checker |
| GET | `/api/complaints` | Public complaints list |
| GET | `/api/complaints/{id}` | Complaint details by ID |

### Citizen Protected Endpoints (`Authorization: Bearer <idToken>`)

| Method | Endpoint | Required Role | Description |
|--------|----------|---------------|-------------|
| GET | `/api/auth/me` | Authenticated | Get current authenticated user profile & role |
| GET | `/api/complaints/my` | Authenticated | Retrieve current user's submitted complaints |
| POST | `/api/complaints` | Authenticated | Submit grievance report with Gemini Multimodal Image Verification |
| PUT | `/api/complaints/{id}` | Authenticated | Update complaint details |
| PATCH | `/api/complaints/{id}/status` | Authenticated | Update complaint status |
| PATCH | `/api/complaints/{id}/resolve` | Authenticated | Mark complaint as resolved with resolution photo & note |

### Admin Endpoints (`ROLE_ADMIN` required)

| Method | Endpoint | Required Role | Description |
|--------|----------|---------------|-------------|
| GET | `/api/admin/complaints` | `ROLE_ADMIN` | Comprehensive admin complaint directory |
| GET | `/api/admin/stats` | `ROLE_ADMIN` | Detailed administrative analytics & ward metrics |
| PATCH | `/api/admin/complaints/{id}/resolve` | `ROLE_ADMIN` | Mark resolved with Gemini Resolution Proof Verification |

---

## Pre-seeded Users

On startup in development mode, the database seeds:
- `admin@nagarseva.com` (Role: `ADMIN`)
- `citizen@nagarseva.com` (Role: `CITIZEN`)

When logging in via Firebase with `admin@nagarseva.com`, the backend automatically matches and preserves the `ADMIN` role.

---

## License

MIT

