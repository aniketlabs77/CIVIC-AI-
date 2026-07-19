# NagarSeva - Getting Started Guide

## 🎯 What You Now Have

A fully functional civic grievance reporting platform with:
- ✅ Backend REST API (Spring Boot)
- ✅ Frontend UI (React + Vite)
- ✅ Photo upload with base64 encoding
- ✅ Geolocation integration
- ✅ Real-time status updates
- ✅ Complaint filtering and tracking

---

## 🚀 Quick Start (5 minutes)

### Step 1: Start the Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

**Expected Output:**
```
...
2024-01-20 10:30:00.000  INFO 12345 --- [ main] c.nagarseva.NagarSevaApplication        : Started NagarSevaApplication in 2.5 seconds
```

**Verify Backend is Running:**
- Visit: http://localhost:8080/api/complaints
- Should see empty JSON array: `[]`

---

### Step 2: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

**Expected Output:**
```
  VITE v4.4.5  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Browser Opens Automatically** or visit: http://localhost:5173

---

## 📝 Testing the Flow (10 minutes)

### Test 1: Report a Complaint

1. **Navigate to:** http://localhost:5173/report
2. **Fill the form:**
   - Category: "Streetlight"
   - Description: "The streetlight near the park is broken"
   - Location: "Central Park, Main Street"
3. **Set Location:**
   - Click "📍 Use My Current Location" (allows browser geolocation)
   - OR manually enter: Latitude: `28.6139` Longitude: `77.2090`
4. **Upload Photo (Optional):**
   - Click file input
   - Select any image from your computer
   - See preview appear
5. **Submit:**
   - Click "Submit Complaint"
   - Should see: ✅ "Complaint submitted successfully! ID: 1"

**What happened:**
- ✅ Photo converted to base64
- ✅ Complaint saved to H2 database
- ✅ Returned complaint object with ID

---

### Test 2: Track the Complaint

1. **Navigate to:** http://localhost:5173/track
2. **Verify:**
   - Page loads with statistics (Total: 1, Open: 1, etc.)
   - Your complaint appears in the list
   - Shows ID, Category, Location, Status (OPEN), photo preview

---

### Test 3: Update Status

1. **On Track page:**
   - Find your complaint
   - Click the status dropdown (currently showing "OPEN")
2. **Change Status:**
   - Select "IN_PROGRESS"
   - See "Updating..." message
   - Status changes to "IN_PROGRESS"
3. **Try Again:**
   - Change to "RESOLVED"
   - Status updates immediately

**What happened:**
- ✅ PATCH request sent to backend
- ✅ Database updated
- ✅ Frontend state updated in real-time

---

### Test 4: Filter Complaints

1. **On Track page:**
   - Top shows filter dropdown (currently "All Complaints")
2. **Try Filtering:**
   - Select "Open" - shows only OPEN complaints
   - Select "In Progress" - shows only IN_PROGRESS
   - Select "Resolved" - shows only RESOLVED
   - Select "All Complaints" - shows all
3. **Statistics:**
   - Update based on filter? (They should always show all, filter only affects list)

---

## 🛠️ Verifying Backend Endpoints

### Using curl or Postman

**Create Complaint:**
```bash
curl -X POST http://localhost:8080/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Road Damage",
    "description": "Pothole blocking traffic",
    "location": "Main Street",
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

**Get All Complaints:**
```bash
curl http://localhost:8080/api/complaints
```

**Get Single Complaint:**
```bash
curl http://localhost:8080/api/complaints/1
```

**Update Status:**
```bash
curl -X PATCH http://localhost:8080/api/complaints/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

---

## 🗄️ Viewing Database

### H2 Console

1. Visit: http://localhost:8080/h2-console
2. **Login:**
   - Driver Class: `org.h2.Driver`
   - JDBC URL: `jdbc:h2:mem:nagarsevadb`
   - User Name: `sa`
   - Password: (leave empty)
   - Click "Connect"
3. **Query Database:**
   - Left panel shows tables
   - Click "COMPLAINTS"
   - Click "SELECT * FROM COMPLAINTS"
   - See all your submitted complaints!

---

## 📊 Understanding the Architecture

### Backend Stack
```
HTTP Request (JSON)
       ↓
ComplaintController (Receives request, validates)
       ↓
ComplaintService (Business logic, updates status)
       ↓
ComplaintRepository (Saves to database via JPA)
       ↓
H2 Database (In-memory SQLite-like DB)
       ↓
Response (Complaint object as JSON)
```

### Frontend Stack
```
User fills form
       ↓
Form validation (React state)
       ↓
Photo upload → FileReader API → Convert to base64
       ↓
Axios HTTP Client
       ↓
POST to Backend API
       ↓
Response received → Update React state
       ↓
UI re-renders with success message
```

---

## 🔍 Debugging Tips

### Open Browser DevTools
Press `F12` in your browser

**Network Tab:**
- See all API requests (POST, GET, PATCH)
- Click each request to see Request/Response JSON
- Check status codes (200, 201, 404, etc.)

**Console Tab:**
- Should be clean (no red errors)
- Can log: `console.log(data)`

**Application Tab:**
- Can inspect React state
- No localStorage being used yet

---

## ⚠️ Common Issues & Fixes

### Issue: "Connection Refused" Error
**Problem:** Backend not running
**Solution:** 
```bash
cd backend
mvn spring-boot:run
```

### Issue: CORS Error in Console
**Problem:** Backend CORS not enabled
**Solution:** Backend already has CorsConfig enabled, ensure it's imported

### Issue: Photo doesn't display
**Problem:** Base64 not being sent
**Solution:** Check console → Network tab → POST request → Verify photoData field

### Issue: Status update returns 404
**Problem:** Wrong complaint ID
**Solution:** Double-check ID in URL matches existing complaint

### Issue: Geolocation shows "Permission Denied"
**Problem:** Browser geolocation blocked
**Solution:** 
- Allow in browser settings
- OR manually enter latitude/longitude

### Issue: Form validation error
**Problem:** Missing required fields
**Solution:** All fields marked with * are required (except photo)

---

## 📱 Mobile Testing

The frontend is fully responsive (Tailwind CSS):
- Works on mobile browsers
- Geolocation works better on mobile
- Can test on phone by:
  1. Backend on: http://localhost:8080
  2. Frontend on: http://YOUR_COMPUTER_IP:5173
  3. Access from phone browser

---

## 🔒 Files Created/Modified

### New Files
- ✅ `IMPLEMENTATION_SUMMARY.md` - Technical details
- ✅ `INTEGRATION_TEST_GUIDE.md` - Detailed testing
- ✅ `GETTING_STARTED.md` - This file

### Modified Files (Backend)
- ✅ `backend/src/main/java/com/nagarseva/entity/Complaint.java`
  - Added photoData field
- ✅ `backend/src/main/java/com/nagarseva/service/ComplaintService.java`
  - Added updateComplaintStatus() method
- ✅ `backend/src/main/java/com/nagarseva/controller/ComplaintController.java`
  - Added PATCH /api/complaints/{id}/status endpoint

### Modified Files (Frontend)
- ✅ `frontend/src/pages/ReportIssue.jsx`
  - Complete form with geolocation and photo upload
- ✅ `frontend/src/pages/TrackComplaints.jsx`
  - List view with filtering and status updates

---

## ✅ Success Checklist

After completing tests, you should have:

- [ ] Backend running without errors
- [ ] Frontend running without errors
- [ ] Can create a complaint with photo
- [ ] Geolocation button works (or manual entry)
- [ ] Complaint appears in Track Complaints list
- [ ] Can filter by status
- [ ] Can update complaint status
- [ ] Status updates reflect in real-time
- [ ] H2 database shows complaint data
- [ ] No console errors
- [ ] API responses visible in Network tab

---

## 📚 Next Steps

### Immediate
1. ✅ Complete the testing above
2. ✅ Verify all endpoints work
3. ✅ Check database contains complaints

### Short Term (Next features)
- [ ] Add user authentication (JWT)
- [ ] Add authorization (admin/user roles)
- [ ] Add complaint comments section
- [ ] Add location autocomplete (Google Places)
- [ ] Add image compression before upload

### Medium Term
- [ ] Switch to PostgreSQL for production
- [ ] Add pagination to complaints list
- [ ] Add sorting and search
- [ ] Add map view of complaints
- [ ] Add email notifications

### Long Term
- [ ] Real-time updates (WebSocket)
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Integration with govt systems
- [ ] ML-based category auto-detection

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `GETTING_STARTED.md` | This file - Quick start |
| `IMPLEMENTATION_SUMMARY.md` | Technical details of what was built |
| `INTEGRATION_TEST_GUIDE.md` | Detailed testing procedures |
| `backend/README.md` | Backend-specific setup |
| `frontend/README.md` | Frontend-specific setup |

---

## 🆘 Need Help?

1. **Check console for errors:** Browser DevTools → Console tab
2. **Check API responses:** Browser DevTools → Network tab
3. **Review logs:** Backend terminal output
4. **Read:** INTEGRATION_TEST_GUIDE.md (troubleshooting section)
5. **Backend still running?** Check port 8080
6. **Frontend still running?** Check port 5173

---

## 🎉 You're All Set!

The core complaint reporting flow is complete and ready to use.

```
Backend:  http://localhost:8080
Frontend: http://localhost:5173
Database: http://localhost:8080/h2-console
```

**Start building features on top of this solid foundation!** 🚀

