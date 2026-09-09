# NagarSeva - Civic Grievance Reporting & Management Platform

**NagarSeva** is a production-hardened civic grievance reporting and municipal resolution platform. It bridges citizens and local government bodies through streamlined reporting, multimodal AI verification, intelligent routing, role-based workflows, and automated escalation.

---

## 🏛️ System Architecture

```
nagar-seva/
├── backend/                  # Spring Boot 3 REST API (Java 17, Maven)
│   ├── src/main/java/com/nagarseva/
│   │   ├── config/           # Security, Firebase, Rate Limiting, CORS, Exceptions
│   │   ├── controller/       # REST Controllers (Complaint, Admin, Dashboard, AI, Safety)
│   │   ├── entity/           # JPA Entities (Complaint, User, Department, Notification)
│   │   ├── repository/       # Spring Data Repositories
│   │   └── service/          # Business Logic (Gemini AI, Escalation, User, Complaint)
│   └── src/main/resources/
│       ├── application.properties        # Default / Dev configuration
│       └── application-prod.properties   # Hardened Production configuration
│
└── frontend/                 # React 18 + Vite + Tailwind CSS (Violet/Indigo Theme)
    ├── src/
    │   ├── components/       # Reusable UI (Navbar, NotificationCenter, SafetyMap, etc.)
    │   ├── context/          # AuthContext (Firebase Auth integration)
    │   ├── pages/            # Page Views (ReportIssue, TrackComplaints, AdminPanel, etc.)
    │   └── services/         # Axios API Client & Endpoints
    └── package.json
```

---

## ✨ Key Features & Capabilities

### 1. Citizen Reporting
- **Multimodal Issue Reporting**: Submit complaints with category, detailed description, ward assignment, GPS coordinates, and photo evidence.
- **Client & Server Size Enforcement**: Strict **2MB max photo upload limit** enforced in `ReportIssue.jsx` and server-side in `ComplaintService` (returns `413 Payload Too Large`).
- **Interactive Map Pinning**: Built-in Leaflet map integration to pick or verify coordinates.
- **Citizen Dashboard & History**: Filter and view submitted complaints with status tags.

### 2. AI Intelligence (Google Gemini 1.5 Flash)
- **Multimodal Vision & NLP**: Evaluates uploaded photo and description using `gemini-1.5-flash`.
- **Automated Department Routing**: Assigns complaints directly to the responsible municipal department (Roads, Electricity, Water & Sanitation, Waste Management, Public Health).
- **Urgency & Priority Scoring**: Classifies priority into `HIGH`, `MEDIUM`, or `LOW` with an AI rationale.
- **Executive Summaries**: Synthesizes concise 1–2 sentence operational summaries for field officers.
- **Resolution Verification**: Evaluates before/after photos and resolution notes to confirm repairs before marking resolved.
- **Graceful Fallback**: Deterministic rule-based heuristic routing if `GEMINI_API_KEY` is not provided in development.

### 3. Municipal Admin Panel
- **Role-Based Access Control (RBAC)**: Enforces `ROLE_ADMIN` on `/api/admin/**` endpoints.
- **Department-Scoped Views**: Department admins only see complaints routed to their jurisdiction; super-admins see all.
- **Resolution Workflow**: Requires resolution note and completion photo proof, triggering AI resolution verification.
- **Live SLA Monitoring**: Identifies overdue complaints nearing or exceeding escalation thresholds.

### 4. Public Analytics Dashboard & Safety
- **Civic Analytics**: Ward-by-ward resolution performance rankings, category distributions, and real-time status metrics via Recharts.
- **Safety Hotspot Heatmap**: Visualizes high-density clusters of unaddressed issues to inform municipal planning.

### 5. Automated Escalation
- Background scheduler periodically checks unresolved `OPEN` complaints exceeding SLA thresholds (configurable via `app.escalation.threshold-minutes`) and escalates them with visual indicators (`escalated: true`).

---

## 🔒 Security & Production Hardening

- **Gated Dev Auth Bypass**: Development demo token bypass (`demo-token:citizen`, `demo-token:admin`) in `FirebaseAuthFilter` is strictly gated to `@Profile("dev")` and permanently disabled in `prod`.
- **IP Rate Limiting**: In-memory sliding window rate limiter (`RateLimitingFilter`) applied to public `POST /api/complaints` (default: 5 requests/minute/IP, returns `429 Too Many Requests` with `Retry-After: 60`). Configurable via `app.rate-limiting.requests-per-minute`.
- **Database Pagination**: `GET /api/complaints` and `GET /api/admin/complaints` return Spring Data `Page<Complaint>` (`page`, `size`, `sort`). Frontend components (`TrackComplaints.jsx`, `AdminPanel.jsx`) render responsive violet/indigo pagination controls.
- **Production Fail-Fast Validator**: `ProdEnvironmentValidator` halts startup under `prod` profile if critical secrets (`DATABASE_URL`, `FIREBASE_CREDENTIALS_PATH`, `GEMINI_API_KEY`) are missing.
- **Production Profiles**: `application-prod.properties` disables the H2 console, turns off `show-sql`, and sets Hibernate SQL logging to `WARN`.

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+** and **Maven 3.8+**
- **Node.js 18+** and **npm 9+**
- *(Optional for Dev)* **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- *(Optional for Dev)* **Firebase Project** service account credentials (demo credentials supported in dev profile)

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd Nagar-Seva/backend
   ```

2. **Configure Environment Variables (Optional in Dev)**:
   ```bash
   # Windows (PowerShell)
   $env:GEMINI_API_KEY="your_gemini_api_key"
   $env:FIREBASE_CREDENTIALS_PATH="path/to/serviceAccountKey.json"

   # Linux/macOS
   export GEMINI_API_KEY="your_gemini_api_key"
   export FIREBASE_CREDENTIALS_PATH="path/to/serviceAccountKey.json"
   ```

3. **Run Backend (Dev Profile - Default)**:
   ```bash
   mvn spring-boot:run
   ```
   The backend boots on `http://localhost:8080`.
   - Health Check: `http://localhost:8080/actuator/health`
   - Dev H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:nagarsevadb`, user: `sa`, password: empty)

4. **Run Backend in Production Mode**:
   ```bash
   mvn clean package -DskipTests
   java -jar target/nagarseva-api-1.0.0.jar --spring.profiles.active=prod
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd Nagar-Seva/frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment (`.env.local`)**:
   ```env
   VITE_API_URL=http://localhost:8080
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 📡 REST API Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/complaints` | Public (Rate Limited) | Submit a complaint (Max 2MB photo, rate limited to 5 req/min) |
| `GET` | `/api/complaints` | Public | Paginated complaints list (`page`, `size`, `sort`) |
| `GET` | `/api/complaints/{id}` | Public | Detailed complaint view |
| `PATCH` | `/api/complaints/{id}/status` | Authenticated | Update complaint status (`OPEN`, `IN_PROGRESS`, `RESOLVED`) |
| `GET` | `/api/complaints/my` | Citizen / Authenticated | Fetch complaints submitted by current user |
| `GET` | `/api/admin/complaints` | Admin (`ROLE_ADMIN`) | Paginated admin complaint queue with department filtering |
| `POST` | `/api/admin/complaints/{id}/resolve` | Admin (`ROLE_ADMIN`) | Resolve complaint with photo proof and note (Gemini verification) |
| `GET` | `/api/admin/stats` | Admin (`ROLE_ADMIN`) | Administrative operational KPIs and SLA counts |
| `GET` | `/api/dashboard/stats` | Public | Ward rankings, category stats, resolution rates |
| `GET` | `/api/safety/heatmap` | Public | Ward safety and grievance density metrics |
| `POST` | `/api/ai/verify` | Authenticated | Test Gemini multimodal verification on an image payload |

---

## 🧪 Testing

The backend includes comprehensive MockMvc and unit tests covering controllers, rate limiting, authentication, environment validation, and AI fallback:

```bash
cd Nagar-Seva/backend
mvn test
```

### Key Test Suites:
- `ComplaintControllerTest`: Verifies public submission, 400 bad requests, 413 photo size ceiling, pagination parameters, and 429 rate limit enforcement.
- `AdminControllerTest`: Validates 401 unauthenticated access, 403 citizen denial, 200 admin paged retrieval, and resolution validation.
- `FirebaseAuthFilterProdTest`: Verifies that `demo-token:` bypass headers are strictly rejected in `prod` profile.
- `SecurityAccessTest`: Validates role-based route protection across admin and citizen paths.
- `UserServiceTest`: Validates Firebase UID auto-provisioning and synchronization.
- `GeminiServiceTest`: Tests AI routing, heuristic fallback, and resolution checks.

---

## 📄 License
This project is licensed under the MIT License.