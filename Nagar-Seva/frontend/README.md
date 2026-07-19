# NagarSeva Frontend - React + Vite

Civic grievance reporting platform frontend built with React 18, Vite, and Tailwind CSS.

## Prerequisites

- **Node.js**: 16 or higher
- **npm**: 7 or higher

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── apiClient.js              # Axios HTTP client
│   ├── components/
│   │   ├── Layout.jsx                # Main layout wrapper
│   │   └── Navbar.jsx                # Navigation bar
│   ├── pages/
│   │   ├── Home.jsx                  # Home page
│   │   ├── ReportIssue.jsx          # Report complaint form
│   │   ├── TrackComplaints.jsx      # Track complaint status
│   │   └── PublicDashboard.jsx      # View all complaints
│   ├── styles/
│   │   └── index.css                 # Global styles with Tailwind
│   ├── App.jsx                       # Main app component
│   └── main.jsx                      # Entry point
├── public/                           # Static assets
├── index.html                        # HTML entry point
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── package.json                     # Dependencies
└── README.md                        # This file
```

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Or copy from the example:
```bash
cp .env.example .env.local
```

### 3. Start the development server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### 4. Build for production

```bash
npm run build
```

The build output will be in the `dist/` folder.

### 5. Preview the production build

```bash
npm run preview
```

## Features

### Pages

- **Home** (`/`): Welcome page with feature overview and call-to-action buttons
- **Report Issue** (`/report`): Form to submit new complaints with all required details
- **Track Complaints** (`/track`): Search and view details of a specific complaint by ID
- **Public Dashboard** (`/dashboard`): View all complaints with filtering and statistics

### Components

- **Layout**: Wrapper component providing Navbar and Footer
- **Navbar**: Navigation bar with links to all pages

## API Integration

The frontend uses Axios to communicate with the backend API at `http://localhost:8080`.

### API Endpoints Used

- `GET /api/complaints` - Fetch all complaints
- `GET /api/complaints/{id}` - Fetch complaint by ID
- `POST /api/complaints` - Create new complaint
- `PUT /api/complaints/{id}` - Update complaint (for future use)
- `DELETE /api/complaints/{id}` - Delete complaint (for future use)

## Styling

Tailwind CSS is configured for rapid UI development. Custom colors are defined in `tailwind.config.js`:
- Primary: Blue (#3b82f6)
- Secondary: Green (#10b981)
- Danger: Red (#ef4444)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8080` |

## Development Tips

1. **Hot Module Replacement (HMR)**: Changes to React components automatically refresh the browser
2. **Fast Build**: Vite provides instant server startup and rapid HMR updates
3. **Tailwind Classes**: Use utility-first approach for styling
4. **React Router**: Client-side routing using `react-router-dom` v6

## Building and Deployment

To deploy the frontend:

1. Build the project: `npm run build`
2. Upload the contents of `dist/` to your hosting provider
3. Configure the environment variable `VITE_API_BASE_URL` to point to your production backend

## Technologies Used

- **React**: 18.2+
- **Vite**: 4.4+
- **React Router**: 6.18+
- **Axios**: 1.6+
- **Tailwind CSS**: 3.3+

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
1. Backend is running on `http://localhost:8080`
2. Backend has CORS enabled for all origins
3. `VITE_API_BASE_URL` in `.env.local` matches your backend URL

### API Connection Fails

1. Check if backend is running: `mvn spring-boot:run`
2. Verify the backend URL in `.env.local`
3. Check network tab in browser DevTools

## License

MIT
