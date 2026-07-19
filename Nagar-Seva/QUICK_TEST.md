# NagarSeva - Quick Test (Right Now!)

## 🚀 Start Servers

### Terminal 1 - Backend
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Wait for:
```
Started NagarSevaApplication in X.XXX seconds
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

Your browser opens to: **http://localhost:5173**

---

## ✅ Test 1: Report Issue (2 min)

### Steps:

1. Click "Report Issue" in navbar
2. **Fill form:**
   - Category: `Streetlight` (select)
   - Description: `The streetlight near the park is broken and causing visibility issues`
   - Location: `Central Park, Main Street`
   - Latitude: `28.6139` (or click geolocation button)
   - Longitude: `77.2090`
3. **Photo (optional):**
   - Click file input
   - Select any image from your computer
   - Should show preview
4. **Submit:** Click "Submit Complaint"
5. **Verify:** ✅ See success message like `"✅ Complaint submitted successfully! ID: 1"`

### What's Happening:
- ✅ React state captures form data
- ✅ Photo converts to base64 string
- ✅ POST request sent to backend
- ✅ Database saves complaint
- ✅ Response returns with ID
- ✅ Form resets for next complaint

---

## ✅ Test 2: Track Complaints (2 min)

### Steps:

1. Click "Track Complaints" in navbar
2. **Verify page loads with:**
   - Statistics at top (Total, Open, In Progress, Resolved)
   - Status filter dropdown (default "All Complaints")
   - Your complaint from Test 1 in the list
3. **Complaint card should show:**
   - ✅ ID (e.g., "1")
   - ✅ Category (e.g., "Streetlight")
   - ✅ Location (e.g., "Central Park, Main Street")
   - ✅ Status badge (yellow "OPEN")
   - ✅ Created date (today)
   - ✅ Description preview
   - ✅ Photo (if uploaded)
   - ✅ Status dropdown (showing "OPEN")

### What's Happening:
- ✅ GET request to `/api/complaints`
- ✅ Backend returns all complaints from database
- ✅ React renders complaint list
- ✅ Photos display as base64 images

---

## ✅ Test 3: Update Status (1 min)

### Steps:

1. On Track Complaints page
2. Find your complaint from Test 1
3. **Click status dropdown** (currently "OPEN")
4. **Select** "IN_PROGRESS"
5. **Verify:**
   - See "Updating..." message
   - Status changes to blue "IN_PROGRESS"
   - Message: ✅ "Status updated to IN_PROGRESS"
6. **Do it again:**
   - Change to "RESOLVED"
   - Status changes to green "RESOLVED"
   - Message: ✅ "Status updated to RESOLVED"

### What's Happening:
- ✅ PATCH request to `/api/complaints/{id}/status`
- ✅ Backend validates status and updates database
- ✅ Response returns updated complaint
- ✅ React updates state immediately
- ✅ UI re-renders with new status

---

## ✅ Test 4: Filter Complaints (1 min)

### Steps:

1. **Create 2-3 more test complaints** (repeat Test 1)
   - Complaint 2: Drainage, change status to IN_PROGRESS
   - Complaint 3: Road Damage, change status to RESOLVED
2. **On Track Complaints page:**
3. **Try each filter:**
   - "All Complaints" → Should show all 3
   - "Open" → Should show only Complaint 1
   - "In Progress" → Should show only Complaint 2
   - "Resolved" → Should show only Complaint 3
   - "All Complaints" → Should show all again

### What's Happening:
- ✅ React filters state locally (no API call)
- ✅ Statistics stay same (based on all complaints)
- ✅ List updates based on filter selection

---

## ✅ Test 5: H2 Database (1 min)

### Steps:

1. Visit: **http://localhost:8080/h2-console**
2. **Login (click Connect):**
   - Driver: `org.h2.Driver`
   - JDBC URL: `jdbc:h2:mem:nagarsevadb`
   - User: `sa`
   - Password: (empty)
3. **Left panel:** Click "COMPLAINTS" table
4. **Run query:** Click the play button
5. **Verify:**
   - See all your test complaints in the table
   - Check: ID, category, description, location, latitude, longitude, status, created_at
   - Photos visible in `photo_data` column (as long base64 strings)

---

## ✅ Test 6: Browser DevTools

### Network Tab (F12 → Network)

Create a complaint and watch:

1. **POST /api/complaints**
   - Status: 201 Created
   - Request body: Your form data (with photoData)
   - Response: Complaint object with ID

2. **GET /api/complaints**
   - Status: 200 OK
   - Response: Array of complaints

3. **PATCH /api/complaints/1/status**
   - Status: 200 OK
   - Request body: `{status: "IN_PROGRESS"}`
   - Response: Updated complaint

### Console Tab (F12 → Console)

- Should be **clean** (no red errors)
- No warnings about CORS (already enabled)
- Can type API calls manually:
  ```javascript
  fetch('http://localhost:8080/api/complaints')
    .then(r => r.json())
    .then(data => console.log(data))
  ```

---

## 🎯 Complete Success Criteria

If you see all these ✅, everything works:

### Backend
- [x] Server starts on http://localhost:8080
- [x] API responds to GET /api/complaints
- [x] Creating complaint returns 201 + ID
- [x] Status update returns 200 + updated object
- [x] H2 database shows complaints
- [x] SQL logging in console

### Frontend
- [x] Frontend loads on http://localhost:5173
- [x] Form has all required fields
- [x] Geolocation button works
- [x] Photo upload converts to base64
- [x] Form submission shows success message
- [x] Track page loads complaint list
- [x] Filter dropdown works
- [x] Status update dropdown works
- [x] No console errors (F12 → Console)
- [x] Network requests visible in DevTools

### Integration
- [x] Form submission creates complaint in backend
- [x] New complaint appears in Track list
- [x] Status update via dropdown saves to backend
- [x] Photo displays in both frontend and database

---

## 🐛 If Something Doesn't Work

### Geolocation Shows Error
- Click "Allow" on browser popup
- Or manually enter: Latitude `28.6139` Longitude `77.2090`

### Photo Upload Shows Error
- Ensure file is an image (JPG, PNG, GIF, WebP)
- File size under 5MB recommended

### Status Update Fails
- Check Network tab (F12) for error response
- Ensure complaint ID is correct
- Check backend console for error logs

### Backend Connection Error
- Ensure backend is still running
- Check: http://localhost:8080/api/complaints
- Should return `[]` or list of complaints

### Frontend Won't Load
- Check if `npm run dev` is still running
- Visit http://localhost:5173
- Check browser console for errors

---

## 📸 Screenshots of Expected UI

### Report Issue Form
```
┌─────────────────────────────────┐
│  NagarSeva  [Report]             │
├─────────────────────────────────┤
│ Report an Issue                  │
│                                  │
│ Category *                       │
│ [Select a category ▼]            │
│                                  │
│ Description *                    │
│ [Large text area for details]    │
│                                  │
│ Location *                       │
│ [Text input]                     │
│                                  │
│ Latitude * [28.6139]             │
│ Longitude * [77.2090]            │
│                                  │
│ [📍 Use My Current Location]     │
│                                  │
│ Upload Photo (Optional)          │
│ [Choose file...]                 │
│                                  │
│ [Submit Complaint]               │
│                                  │
│ ✅ Success! ID: 1                │
└─────────────────────────────────┘
```

### Track Complaints Page
```
┌─────────────────────────────────┐
│  NagarSeva  [Track]              │
├─────────────────────────────────┤
│ Track Complaints                 │
│                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│ │  3  │ │  1  │ │  1  │ │  1  │ │
│ │Total│ │Open │ │In..  │ │Resol│ │
│ └─────┘ └─────┘ └─────┘ └─────┘ │
│                                  │
│ Filter: [All Complaints ▼]       │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ID: 1   Streetlight   OPEN ● │ │
│ │ Location: Main Street        │ │
│ │ Description: The streetlight │ │
│ │ [Photo]                      │ │
│ │ [OPEN ▼] Update...           │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ID: 2   Drainage   IN_PROG ● │ │
│ │ ...                          │ │
│ └──────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## ⏱️ Total Time to Complete All Tests

- **Test 1 (Report):** 2 min
- **Test 2 (Track):** 2 min
- **Test 3 (Update Status):** 1 min
- **Test 4 (Filter):** 1 min
- **Test 5 (Database):** 1 min
- **Test 6 (DevTools):** 1 min

**Total: ~8 minutes** ⚡

---

## 🎉 When All Tests Pass

You have successfully implemented:

✅ **Complete complaint reporting system**
✅ **Photo upload with base64 encoding**
✅ **Geolocation integration**
✅ **Status tracking and updates**
✅ **Real-time filtering**
✅ **Full frontend-backend integration**

**The hard part is done. Everything else is features!** 🚀

---

## 📚 Next Steps

Once tests pass, you can add:

1. **Sorting** - Sort by date, category, status
2. **Search** - Find by location or description
3. **Pagination** - Show 10 per page instead of all
4. **Map View** - Display complaints on a map
5. **Comments** - Add comments/updates to complaints
6. **Authentication** - Login system
7. **Admin Dashboard** - Manage complaints
8. **Notifications** - Email/SMS updates
9. **Analytics** - Charts and statistics
10. **Mobile App** - React Native version

All of these build on the solid foundation you have now! 🏗️

