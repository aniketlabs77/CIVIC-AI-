# NagarSeva - Integration Test Guide

## Overview
This guide walks through testing the complete complaint reporting flow between the Spring Boot backend and React frontend.

## Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`
- Both have CORS enabled and can communicate

## API Endpoints Implemented

### POST /api/complaints
**Create a new complaint**

Request body:
```json
{
  "category": "Streetlight",
  "description": "The streetlight near the park is broken",
  "location": "Central Park, Main Street",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "photoData": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

Response (201 Created):
```json
{
  "id": 1,
  "category": "Streetlight",
  "description": "The streetlight near the park is broken",
  "location": "Central Park, Main Street",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "photoUrl": null,
  "photoData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "routedAuthority": null,
  "status": "OPEN",
  "createdAt": "2024-01-20T10:30:45.123456",
  "escalated": false
}
```

### GET /api/complaints
**Retrieve all complaints**

Response (200 OK):
```json
[
  {
    "id": 1,
    "category": "Streetlight",
    "description": "The streetlight near the park is broken",
    "location": "Central Park, Main Street",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "photoUrl": null,
    "photoData": "data:image/png;base64,...",
    "routedAuthority": null,
    "status": "OPEN",
    "createdAt": "2024-01-20T10:30:45.123456",
    "escalated": false
  },
  ...
]
```

### GET /api/complaints/{id}
**Retrieve a specific complaint**

Response (200 OK):
```json
{
  "id": 1,
  "category": "Streetlight",
  ...
}
```

Response (404 Not Found) if complaint doesn't exist

### PATCH /api/complaints/{id}/status
**Update complaint status**

Request body:
```json
{
  "status": "IN_PROGRESS"
}
```

Response (200 OK):
```json
{
  "id": 1,
  "category": "Streetlight",
  ...,
  "status": "IN_PROGRESS",
  ...
}
```

Valid status values: `OPEN`, `IN_PROGRESS`, `RESOLVED`

Response (404 Not Found) if complaint doesn't exist
Response (400 Bad Request) if status is invalid

---

## Frontend Pages & Features

### Report Issue Page (`/report`)

**Features:**
- ✅ Category dropdown (Streetlight, Drainage, Road Damage, Illegal Dumping, Unsafe Area, Encroachment)
- ✅ Description textarea
- ✅ Location text input
- ✅ Latitude/Longitude number inputs
- ✅ "Use my current location" button (browser geolocation API)
- ✅ Photo file upload with base64 conversion
- ✅ Photo preview display
- ✅ Form validation (all required fields)
- ✅ Success/error messages
- ✅ Form reset after successful submission

**Test Steps:**
1. Navigate to `http://localhost:5173/report`
2. Select a category (e.g., "Streetlight")
3. Enter description: "The streetlight near the park is broken"
4. Enter location: "Central Park, Main Street"
5. Click "📍 Use My Current Location" (if geolocation is enabled, or manually enter lat/lng)
6. (Optional) Upload a photo - will show preview
7. Click "Submit Complaint"
8. Should see success message with complaint ID

**Expected Behavior:**
- Form validates all required fields
- Photo is converted to base64 before sending
- POST request sent to `/api/complaints`
- Success message displays complaint ID
- Form resets on success

---

### Track Complaints Page (`/track`)

**Features:**
- ✅ Fetch all complaints on page load
- ✅ Display complaints in card/grid view
- ✅ Show complaint ID, Category, Location, Status, Created Date
- ✅ Display description preview
- ✅ Show photo if available
- ✅ Status filter dropdown (ALL, OPEN, IN_PROGRESS, RESOLVED)
- ✅ Inline status update via dropdown
- ✅ Statistics cards (Total, Open, In Progress, Resolved)
- ✅ Color-coded status badges
- ✅ Loading state
- ✅ Error handling
- ✅ Empty state message

**Test Steps:**
1. Navigate to `http://localhost:5173/track`
2. Should see statistics at top
3. Should see list of all complaints
4. Each complaint card shows: ID, Category, Location, Status, Date, Description preview
5. Test filter: Select "Open" from dropdown - should show only OPEN complaints
6. Test status update: Click on status dropdown for a complaint, select "IN_PROGRESS"
7. Should see "Updating..." indicator, then card updates
8. Filter to show only "Resolved" complaints
9. Update a complaint to "RESOLVED"

**Expected Behavior:**
- GET `/api/complaints` called on mount
- Complaints display in card format
- Filter works correctly, showing/hiding based on status
- Dropdown changes trigger PATCH request
- Stats update in real-time
- No page refresh needed

---

## Test Scenario: Complete Flow

### Step 1: Report a New Complaint
1. Go to **Report Issue** page
2. Fill form:
   - Category: "Road Damage"
   - Description: "Large pothole on Main Street blocking traffic"
   - Location: "Main Street, Downtown"
   - Latitude: 28.6139
   - Longitude: 77.2090
   - Photo: (optional, upload an image)
3. Click Submit
4. Confirm success message shows (e.g., "✅ Complaint submitted successfully! ID: 1")

### Step 2: View Complaint in List
1. Go to **Track Complaints** page
2. Verify the new complaint appears in the list
3. Verify all details match (ID, category, location, status should be OPEN)
4. Verify photo is displayed if uploaded

### Step 3: Update Complaint Status
1. On **Track Complaints** page, find the complaint
2. Change status dropdown from "OPEN" to "IN_PROGRESS"
3. Verify "Updating..." message appears
4. Verify complaint status updates to "IN_PROGRESS"
5. Change status to "RESOLVED"
6. Verify status updates successfully

### Step 4: Test Filtering
1. Create 2-3 complaints with different statuses
2. Filter by "OPEN" - should show only OPEN complaints
3. Filter by "IN_PROGRESS" - should show only IN_PROGRESS complaints
4. Filter by "RESOLVED" - should show only RESOLVED complaints
5. Filter by "ALL" - should show all complaints
6. Verify statistics update correctly

### Step 5: Test Error Handling
1. Try submitting report form without required fields - should show validation error
2. Try uploading non-image file - should show error
3. Manually test backend 404 by entering invalid complaint ID in GET request
4. Network should fail gracefully with error messages

---

## Browser DevTools Testing

### Network Tab
1. Open DevTools (F12) → Network tab
2. Perform each action and verify requests:
   - POST /api/complaints (201 Created)
   - GET /api/complaints (200 OK)
   - PATCH /api/complaints/{id}/status (200 OK)

### Console
- No JavaScript errors should appear
- API calls logged for debugging

### Local Storage / Session Storage
- Frontend stores nothing (stateless for now)
- Can add later if needed

---

## Geolocation Testing

### Desktop Browser
- Click "Use my current location"
- Browser will ask for permission
- If allowed, should populate lat/lng with your current location
- If denied, error message appears

### Mobile Browser
- Same flow, likely more accurate location data

### Testing with Mock Location
- If geolocation blocked, manually enter lat/lng values
- Values used: 28.6139, 77.2090 (New Delhi)

---

## Photo Upload Testing

### Valid Scenarios
- Upload .jpg, .png, .gif, .webp
- Small images (< 5MB) encode quickly
- Large images might take longer but work
- Preview displays before submission

### Invalid Scenarios
- Try uploading .pdf or .txt file - should show error
- Try uploading video file - should show error

### Base64 Encoding
- FileReader API converts image to base64
- Sent in `photoData` field (LONGTEXT column in DB)
- Can retrieve and display as `<img src={complaint.photoData}>`

---

## Troubleshooting

### "CORS Error" in Console
**Solution:** Ensure backend is running with CorsConfig enabled

### "Connection Refused" on API calls
**Solution:** Verify backend is running on port 8080 and VITE_API_BASE_URL is set correctly

### Photo doesn't display
**Solution:** Check photoData is being sent as base64 string (should start with "data:image/")

### Status update fails silently
**Solution:** Check Network tab to see actual error response from backend

### Geolocation returns error
**Solution:** Check browser permissions, or manually enter coordinates

---

## Success Criteria

✅ Create complaint via POST /api/complaints
✅ List all complaints via GET /api/complaints
✅ Get single complaint via GET /api/complaints/{id}
✅ Update status via PATCH /api/complaints/{id}/status
✅ Form validation works on frontend
✅ Photo upload and base64 conversion works
✅ Geolocation API integration works
✅ Filter and search work correctly
✅ Status updates reflect in real-time
✅ Error messages display appropriately
✅ No console errors or warnings

---

## Next Steps (Future Features)

- [ ] Add pagination for large complaint lists
- [ ] Add sorting (by date, category, status)
- [ ] Add search by location or description
- [ ] Add map view of complaints
- [ ] Add user authentication
- [ ] Add complaint history/timeline
- [ ] Add comments/updates section
- [ ] Add email notifications
- [ ] Export complaints to CSV/PDF
- [ ] Add image compression before upload

