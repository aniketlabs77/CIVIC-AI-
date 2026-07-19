# NagarSeva Backend - Spring Boot REST API

Civic grievance reporting platform backend built with Spring Boot 3.x and Maven.

## Prerequisites

- **Java**: 17 or higher
- **Maven**: 3.6 or higher

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/nagarseva/
│   │   │   ├── NagarSevaApplication.java       # Main entry point
│   │   │   ├── config/
│   │   │   │   └── CorsConfig.java            # CORS configuration
│   │   │   ├── controller/
│   │   │   │   └── ComplaintController.java   # REST endpoints
│   │   │   ├── entity/
│   │   │   │   ├── Complaint.java             # JPA entity
│   │   │   │   └── ComplaintStatus.java       # Enum for status
│   │   │   ├── repository/
│   │   │   │   └── ComplaintRepository.java   # JPA repository
│   │   │   └── service/
│   │   │       └── ComplaintService.java      # Business logic
│   │   └── resources/
│   │       └── application.properties         # Configuration
│   └── test/
└── pom.xml                                    # Maven dependencies
```

## Setup Instructions

### 1. Build the project

```bash
mvn clean install
```

### 2. Run the application

```bash
mvn spring-boot:run
```

The API will start on `http://localhost:8080`

### 3. Access H2 Console

Navigate to: `http://localhost:8080/h2-console`

- **JDBC URL**: `jdbc:h2:mem:nagarsevadb`
- **Username**: `sa`
- **Password**: (leave empty)

### 4. Test the API

You can use tools like Postman or curl to test the endpoints:

```bash
# Get all complaints
curl http://localhost:8080/api/complaints

# Get complaint by ID
curl http://localhost:8080/api/complaints/1

# Create a new complaint
curl -X POST http://localhost:8080/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Road Damage",
    "description": "Pothole on Main Street",
    "location": "Main Street, City Center",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "photoUrl": "https://example.com/image.jpg"
  }'

# Update complaint
curl -X PUT http://localhost:8080/api/complaints/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'

# Delete complaint
curl -X DELETE http://localhost:8080/api/complaints/1
```

## API Endpoints

### Complaints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/complaints` | Retrieve all complaints |
| GET | `/api/complaints/{id}` | Retrieve complaint by ID |
| POST | `/api/complaints` | Create a new complaint |
| PUT | `/api/complaints/{id}` | Update an existing complaint |
| DELETE | `/api/complaints/{id}` | Delete a complaint |

## Complaint Entity

```json
{
  "id": 1,
  "category": "Road Damage",
  "description": "Pothole on Main Street",
  "location": "Main Street, City Center",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "photoUrl": "https://example.com/image.jpg",
  "routedAuthority": "Public Works Department",
  "status": "OPEN",
  "createdAt": "2024-01-15T10:30:00",
  "escalated": false
}
```

### Complaint Status Options

- `OPEN` - Newly reported complaint
- `IN_PROGRESS` - Being handled by authority
- `RESOLVED` - Issue resolved

## Technologies Used

- **Spring Boot**: 3.1.5
- **Java**: 17
- **Maven**: Dependency management
- **Spring Data JPA**: ORM
- **H2 Database**: In-memory database (development)
- **Spring CORS**: Cross-Origin Resource Sharing

## Database

Currently using H2 in-memory database. To switch to PostgreSQL before production:

1. Replace H2 dependency with PostgreSQL driver in `pom.xml`
2. Update `application.properties` with PostgreSQL connection details
3. Change `spring.jpa.hibernate.ddl-auto` to `validate` or `update`

## Notes

- CORS is enabled for all origins (change before production)
- H2 console is enabled for development
- SQL logging is enabled for debugging
- Database is reset on each application restart (in-memory mode)

## Development

To enable automatic restart during development:
- The `spring-boot-devtools` dependency is included
- Rebuild the project after file changes and the app will auto-reload

## License

MIT
