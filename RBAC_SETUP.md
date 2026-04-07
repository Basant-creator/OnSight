# Role-Based Access Control (RBAC) Implementation

This project now includes a complete RBAC system with JWT authentication and role-based authorization.

## Architecture Overview

### 1. **User Model** (`backend/models/User.js`)
- Users have three role types: `student`, `teacher`, `admin`
- Default role is `student`

### 2. **Authentication Middleware** (`backend/middleware/auth.middleware.js`)
- Verifies JWT tokens from the `Authorization` header
- Expects format: `Bearer <token>`
- Attaches decoded user info to `req.user`
- Returns 401 if token is missing or invalid

### 3. **Authorization Middleware** (`backend/middleware/role.middleware.js`)
- Checks if authenticated user has required roles
- Can accept multiple allowed roles
- Returns 403 if user role is not authorized

### 4. **Auth Routes** (`backend/routes/auth.js`)
- **POST `/auth/signup`** - Register new user with optional role
  - Returns: `{ message, user, token }`
- **POST `/auth/login`** - Authenticate user
  - Returns: `{ message, token, user }`
  - Token expires in 24 hours

## Usage Examples

### 1. Sign Up & Get Token
```bash
POST /auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "role": "teacher"
}

Response:
{
  "message": "Signup successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "teacher"
  }
}
```

### 2. Login & Get Token
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}

Response:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### 3. Access Protected Route with Token
```bash
GET /api/teacher/questions
Authorization: Bearer eyJhbGc...

Response:
{
  "message": "Teacher - Manage exam questions",
  "user": {
    "id": "...",
    "email": "john@example.com",
    "role": "teacher"
  }
}
```

## Protecting Routes

### Single Role Protection
```javascript
router.get("/admin/dashboard", 
  authenticateToken,                    // Verify token
  authorizeRole("admin"),               // Only admin
  (req, res) => {
    // Handler
  }
);
```

### Multiple Roles
```javascript
router.post("/submit-exam",
  authenticateToken,
  authorizeRole("student", "teacher"),  // Student OR teacher
  (req, res) => {
    // Handler
  }
);
```

## Environment Configuration

Add to `.env`:
```
JWT_SECRET=your-super-secret-key-change-this
MONGO_URI=mongodb://127.0.0.1:27017/exam_platform
PORT=3000
```

## Security Notes

1. **JWT_SECRET**: Change the default secret in production
2. **Token Expiry**: Tokens expire in 24 hours (configurable in auth.js)
3. **Password Hashing**: Uses bcryptjs with salt rounds of 10
4. **Role Assignment**: Admins/teachers must be manually assigned via signup `role` parameter

## Available Routes

| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| POST | /auth/signup | ❌ | All | Register user |
| POST | /auth/login | ❌ | All | Login & get token |
| GET | /api/admin/dashboard | ✅ | Admin | Admin panel |
| GET | /api/teacher/questions | ✅ | Teacher | Manage questions |
| GET | /api/student/exams | ✅ | Student | View exams |
| POST | /api/submit-exam | ✅ | Student, Teacher | Submit exam |

## Implementation Checklist

- [x] Role field in User model
- [x] JWT token generation on login
- [x] Authentication middleware
- [x] Authorization middleware
- [x] Protected route examples
- [x] Server integration

## Future Enhancements

- [ ] Refresh token rotation
- [ ] Role hierarchy (admin > teacher > student)
- [ ] Permission-based access (granular than roles)
- [ ] Audit logging for access control
- [ ] Rate limiting on auth endpoints
