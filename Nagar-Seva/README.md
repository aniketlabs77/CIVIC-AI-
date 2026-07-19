# NagarSeva - Civic Grievance Reporting Platform

A full-stack web application for citizens to report civic grievances and track their resolution status.

## Project Structure

```
NagarSeva/
├── backend/          # Spring Boot REST API
├── frontend/         # React + Vite frontend
└── README.md         # This file
```

## Features

- 📋 Report civic grievances (complaints) with photo upload & geolocation
- 🔍 Track complaint status with real-time updates
- 📊 Public dashboard with statistics, charts & ward rankings
- 🗺️ Location-based complaint reporting with ward assignment
- 👥 AI-powered auto-routing to relevant authorities (Groq Llama 3.3)
- ⚡ Priority classification (High/Medium/Low) & AI-generated summaries
- 🚨 Auto-escalation of stale complaints (configurable threshold)
- ✅ Input validation & global error handling

---

## How to Run

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Java** | 17+ | Backend runtime |
| **Maven** | 3.6+ | Backend build tool |
| **Node.js** | 18+ | Frontend runtime |
| **npm** | 9+ | Frontend package manager |
| **Groq API Key** | Optional | AI routing (from [console.groq.com](https://console.groq.com)) |
| **PostgreSQL** | Optional | Production database; H2 in-memory works for local/demo |

---

### Local Setup — Backend

1. **Navigate to the backend folder**
   ```bash
   cd backend
   ```

2. **(Optional) Set Groq API Key** — without it, the app uses rule-based fallback routing
   ```bash
   # Linux/macOS
   export GROQ_API_KEY=gsk_your_key_here

   # Windows (PowerShell)
   $env:GROQ_API_KEY="gsk_your_key_here"
   ```

3. **Run the Spring Boot app**
   ```bash
   mvn spring-boot:run
   ```
   Or if you prefer a clean build first:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

4. **Verify it started successfully**
   - The app runs on **port 8080** (or 8081 if 8080 is busy)
   - Look for this log line: `Started NagarSevaApplication in X.XXX seconds`
   - Health check: `curl http://localhost:8080/actuator/health` → should return `{"status":"UP"}`
   - H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:nagarsevadb`, user: `sa`, password: empty)

---

### Local Setup — Frontend

1. **Navigate to the frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` pointing to the local backend**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   ```
   Or create it manually:
   ```bash
   echo "VITE_API_URL=http://localhost:8080" > .env.local
   ```
   **Note:** If your backend runs on a different port (e.g., 8081), update the URL accordingly.

4. **Run the dev server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - The app will be available at **http://localhost:5173**
   - Vite will auto-open the browser, or click the link in the terminal

---

### Demo Walkthrough

1. **Report an Issue**
   - Open http://localhost:5173
   - Click **"Report Issue"** in the navbar
   - Fill in: Category (e.g., "Streetlight"), Description, Location, Ward (default "Ward 1"), Latitude/Longitude (or click "Use My Current Location")
   - Optionally upload a photo
   - Click **"Submit Complaint"** — you'll see a success message with the complaint ID

2. **Track Complaints**
   - Click **"Track Complaints"** in the navbar
   - You'll see all complaints with AI-generated fields:
     - **Routed Authority** (e.g., "Electricity Department")
     - **Priority** badge (HIGH=red, MEDIUM=yellow, LOW=green)
     - **AI Summary** (1-2 sentence summary for the authority)
     - **Escalated** status (⚠️ Yes / ✅ No)
   - Use the status dropdown to change a complaint's status (OPEN → IN_PROGRESS → RESOLVED)
   - Filter by status using the dropdown

3. **Public Dashboard**
   - Click **"Dashboard"** in the navbar
   - View 4 summary cards: Total, Resolved, Pending, Escalated
   - See **Complaints per Ward** bar chart (total vs resolved)
   - See **Complaints by Category** bar chart
   - View **Ward Resolution Rate Ranking** table with resolution % and avg resolution time
   - Color-coded complaint list (red=OPEN, yellow=IN_PROGRESS, green=RESOLVED)

4. **Auto-Escalation Demo**
   - The demo threshold is **5 minutes** (represents X days in production)
   - Any complaint with status **OPEN** for >5 minutes gets auto-escalated
   - Check the `escalated` field in Track Complaints or Dashboard
   - To test: create a complaint, wait 5+ minutes, refresh — it will show ⚠️ Yes

---

### Deployment

Required environment variables for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `GROQ_API_KEY` | Groq API key for AI routing | `gsk_...` |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated | `https://your-frontend.com` |
| `VITE_API_URL` | Frontend → backend API URL | `https://your-backend.com` |
| `APP_ESCALATION_THRESHOLD_MINUTES` | Minutes before auto-escalation (default 5) | `1440` (24 hrs) |

**Production build commands:**
```bash
# Backend
cd backend && mvn clean package -DskipTests
java -jar target/nagarseva-api-1.0.0.jar

# Frontend
cd frontend && npm run build
# Serve the `dist/` folder with nginx, Vercel, Netlify, etc.
```

---

### Troubleshooting

| Issue | Fix |
|-------|-----|
| **Port 8080 already in use** | Kill the process: `fuser -k 8080/tcp` (Linux/macOS) or `netstat -ano \| findstr :8080` then `taskkill /PID <pid> /F` (Windows). Or change port in `application.properties`: `server.port=8081` |
| **CORS error in browser console** | Ensure `VITE_API_URL` in `frontend/.env.local` matches the backend URL exactly (including port). For production, set `FRONTEND_URL` backend env var to your frontend domain. |
| **Backend fails to start with "Web server failed to start"** | Port conflict — see "Port 8080 already in use" above. |
| **Frontend shows "Failed to load complaints"** | Check that backend is running and `VITE_API_URL` is correct. Test with `curl http://localhost:8080/api/complaints`. |
| **Validation errors on submit** | All fields are required: category, description, location, ward, latitude, longitude. Description must be 10-2000 chars. Latitude -90 to 90, Longitude -180 to 180. |

---

## API Endpoints

### Complaints
- `GET /api/complaints` - List all complaints
- `GET /api/complaints/{id}` - Get complaint by ID
- `POST /api/complaints` - Create new complaint (validates: category, description, location, ward, latitude, longitude)
- `PUT /api/complaints/{id}` - Update complaint
- `PATCH /api/complaints/{id}/status` - Update complaint status
- `DELETE /api/complaints/{id}` - Delete complaint

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics:
  - `totalComplaints`, `resolvedCount`, `pendingCount`, `escalatedCount`
  - `complaintsByWard`: `{total, resolved, resolutionRate, avgResolutionTimeHours}`
  - `complaintsByCategory`: `{category: count}`

---

## Database

- **Development**: H2 in-memory database (auto-creates schema, seeds 10 sample complaints)
- **Production**: PostgreSQL (set `DATABASE_URL` env var)
- Schema auto-managed by Hibernate (`ddl-auto`)

---

## Technology Stack

### Backend
- Spring Boot 3.x
- Spring Data JPA / Hibernate
- H2 Database (dev) / PostgreSQL (prod)
- Groq API (AI routing via llama-3.3-70b-versatile)
- Spring Scheduling (auto-escalation)
- Bean Validation (input validation)
- Maven

### Frontend
- React 18+
- Vite
- React Router v6
- Axios
- Tailwind CSS
- Recharts (dashboard charts)

---

## License

MIT