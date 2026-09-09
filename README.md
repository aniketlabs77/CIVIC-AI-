# NagarSeva (नगर सेवा) - Civic Grievance Reporting Platform

An intelligent, full-stack civic tech platform connecting citizens with municipal authorities to report, track, and resolve civic grievances efficiently.

---

## 📌 Repository Overview

This repository contains the full source code for the NagarSeva platform:

```
nagarseva-hackathon/
├── Nagar-Seva/
│   ├── backend/          # Spring Boot 3 REST API (Java 17, Spring Security, JPA, Gemini AI)
│   ├── frontend/         # React 18 + Vite + Tailwind CSS (Violet/Indigo UI theme)
│   └── README.md         # Detailed architectural & API documentation
├── vercel.json           # Vercel deployment configuration
└── README.md             # Project overview & navigation guide (this file)
```

For complete API specifications, endpoint tables, and component deep dives, see the [Nagar-Seva Documentation](Nagar-Seva/README.md).

---

## 🌟 Core Highlights

- **Multimodal AI Analysis (Google Gemini 1.5 Flash)**:
  - Automatically assesses grievance descriptions and photos for credibility.
  - Automatically routes complaints to the appropriate municipal department (Roads, Electricity, Water & Sanitation, Waste Management, Public Health).
  - Categorizes priority (`HIGH`, `MEDIUM`, `LOW`) and generates AI summaries for officials.
  - Verifies before/after resolution proof photos before grievances are marked resolved.
  - Graceful deterministic fallback when Gemini API key is absent.

- **Authentication & Role-Based Access (Firebase Auth)**:
  - Citizens report and track their own issues.
  - Department Admins manage and resolve issues within their municipal scope.
  - Super Admins oversee city-wide statistics, ward rankings, and department accountability.
  - Development token bypass strictly disabled in production profile (`@Profile("dev")`).

- **Modern Civic UI**:
  - Built with React 18, Vite, and styled with Tailwind CSS in an accessible Violet/Indigo theme.
  - Interactive Leaflet map pinning and safety hotspot cluster visualization.
  - Real-time status badges, public transparency dashboard, and charts with Recharts.

- **Production-Hardened Engineering**:
  - **Rate Limiting**: Sliding-window IP limiter protecting `POST /api/complaints` (5 req/min/IP).
  - **Pagination**: Spring Data `Pageable` pagination across citizen tracking and admin listings.
  - **Upload Size Guard**: Client-side and server-side 2MB maximum photo upload enforcement (returns HTTP 413).
  - **Environment Fail-Fast**: `ProdEnvironmentValidator` ensures all production credentials are valid at boot time.

---

## ⚡ Quick Start

### 1. Run the Backend (Spring Boot)
```bash
cd Nagar-Seva/backend

# Optional: Set your Gemini API key for live AI routing
# Windows PowerShell: $env:GEMINI_API_KEY="your-gemini-key"
# Linux/macOS:        export GEMINI_API_KEY="your-gemini-key"

mvn spring-boot:run
```
- Backend runs on `http://localhost:8080`
- In-memory H2 Console (dev): `http://localhost:8080/h2-console`

### 2. Run the Frontend (React + Vite)
```bash
cd Nagar-Seva/frontend
npm install
npm run dev
```
- Frontend application runs on `http://localhost:5173`

---

## 🧪 Testing

Run the full automated test suite (31 unit & MockMvc integration tests):
```bash
cd Nagar-Seva/backend
mvn test
```

Build the production frontend bundle:
```bash
cd Nagar-Seva/frontend
npm run build
```

---

## 📖 Detailed Documentation

For comprehensive details on environment variables, production deployment, database schemas, and REST endpoints, refer to [Nagar-Seva/README.md](Nagar-Seva/README.md).

---

## ⚖️ License

Distributed under the MIT License.