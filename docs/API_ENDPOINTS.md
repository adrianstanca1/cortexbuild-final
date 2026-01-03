# API Endpoints - Complete Reference

## Authentication Required
All endpoints except `/api/health` require authentication via session cookie or JWT token.

---

## Provisioning API

### Create Company
**Endpoint:** `POST /api/provisioning/companies`  
**Auth:** SUPERADMIN required  
**Request Body:**
```json
{
  "company": {
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "legalName": "Acme Corporation Inc.",
    "industry": "Technology",
    "region": "US",
    "plan": "Professional"
  },
  "owner": {
    "name": "John Doe",
    "email": "john@acme.com",
    "title": "CEO"
  }
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "company": { "id": "c-...", "status": "DRAFT", ... },
    "owner": { "id": "u-...", "email": "john@acme.com" },
    "invitation": {
      "id": "inv-...",
      "token": "...",
      "expiresAt": "2025-01-04T00:00:00Z",
      "invitationUrl": "https://app.com/accept-invitation?token=..."
    }
  }
}
```

### Activate Company
**Endpoint:** `POST /api/provisioning/companies/:id/activate`  
**Auth:** SUPERADMIN required  
**Description:** Transitions company from DRAFT to ACTIVE status  
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "c-123",
    "status": "ACTIVE",
    "activatedAt": "2025-12-28T05:00:00Z"
  }
}
```

### Resend Invitation
**Endpoint:** `POST /api/provisioning/invitations/:id/resend`  
**Auth:** SUPERADMIN required  
**Description:** Resends invitation email to company owner  
**Response:**
```json
{
  "success": true,
  "message": "Invitation resent",
  "invitation": {
    "id": "inv-123",
    "email": "john@acme.com",
    "expiresAt": "2025-01-04T00:00:00Z"
  }
}
```

### Accept Invitation
**Endpoint:** `POST /api/provisioning/invitations/:token/accept`  
**Auth:** Public (token-based)  
**Request Body:**
```json
{
  "password": "SecurePass123!",
  "name": "John Doe"
}
```
**Description:** Accepts invitation, sets password, activates user and company  
**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted",
  "session": { "token": "...", "user": {...} }
}
```

---

## Company Management API

### Get All Companies
**Endpoint:** `GET /api/companies/all`  
**Auth:** SUPERADMIN required  
**Description:** Returns all companies in the system  
**Response:**
```json
[
  {
    "id": "c-123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "status": "ACTIVE",
    "plan": "Professional",
    "industry": "Technology",
    "region": "US",
    "users": 25,
    "projects": 10,
    "mrr": 499,
    "createdAt": "2025-12-01T00:00:00Z",
    "lastActivityAt": "2025-12-28T00:00:00Z"
  }
]
```

### Get Company Stats
**Endpoint:** `GET /api/companies/stats`  
**Auth:** SUPERADMIN required  
**Description:** Returns aggregate statistics  
**Response:**
```json
{
  "totalCompanies": 150,
  "activeCompanies": 120,
  "suspendedCompanies": 5,
  "totalUsers": 3500,
  "totalProjects": 850,
  "totalMrr": 125000,
  "recentCompanies": 12
}
```

### Suspend Company
**Endpoint:** `POST /api/companies/:id/suspend`  
**Auth:** SUPERADMIN required  
**Request Body:**
```json
{
  "reason": "Payment overdue"
}
```
**Description:** Suspends company and blocks user access  
**Response:**
```json
{
  "success": true,
  "message": "Company suspended",
  "company": {
    "id": "c-123",
    "status": "SUSPENDED",
    "suspendedAt": "2025-12-28T05:00:00Z",
    "suspensionReason": "Payment overdue"
  }
}
```

### Activate Company
**Endpoint:** `POST /api/companies/:id/activate`  
**Auth:** SUPERADMIN required  
**Description:** Reactivates a suspended company  
**Response:**
```json
{
  "success": true,
  "message": "Company activated",
  "company": {
    "id": "c-123",
    "status": "ACTIVE",
    "activatedAt": "2025-12-28T05:00:00Z"
  }
}
```

---

## Feature Management API

### Get Company Features
**Endpoint:** `GET /api/companies/:id/features`  
**Auth:** SUPERADMIN or COMPANY_OWNER  
**Description:** Lists all features and their status for a company  
**Response:**
```json
{
  "features": [
    {
      "name": "api_access",
      "displayname": "API Access",
      "category": "INTEGRATIONS",
      "description": "Access to REST API and webhooks",
      "enabled": true,
      "requiresfeatures": null,
      "config": {}
    }
  ]
}
```

### Get Single Feature Status
**Endpoint:** `GET /api/companies/:id/features/:featureName`  
**Auth:** SUPERADMIN or COMPANY_OWNER  
**Description:** Check if a specific feature is enabled  
**Response:**
```json
{
  "name": "api_access",
  "enabled": true,
  "config": { "rateLimitPerDay": 10000 }
}
```

### Toggle Feature
**Endpoint:** `PATCH /api/companies/:id/features/:featureName`  
**Auth:** SUPERADMIN required  
**Request Body:**
```json
{
  "enabled": true,
  "config": { "rateLimitPerDay": 10000 }
}
```
**Description:** Enable or disable a feature for a company  
**Response:**
```json
{
  "success": true,
  "feature": {
    "name": "api_access",
    "enabled": true,
    "config": { "rateLimitPerDay": 10000 }
  }
}
```

---

## Resource Limits API

### Get Company Limits
**Endpoint:** `GET /api/companies/:id/limits`  
**Auth:** SUPERADMIN or COMPANY_OWNER  
**Description:** Returns resource quotas and current usage  
**Response:**
```json
{
  "limits": [
    {
      "limittype": "user_seats",
      "limitvalue": 50,
      "currentusage": 25,
      "alertthreshold": 40,
      "softlimit": true
    },
    {
      "limittype": "projects",
      "limitvalue": 100,
      "currentusage": 45,
      "alertthreshold": 80,
      "softlimit": false
    }
  ]
}
```

### Update Company Limit
**Endpoint:** `PATCH /api/companies/:id/limits/:limitType`  
**Auth:** SUPERADMIN required  
**Request Body:**
```json
{
  "limitValue": 100,
  "alertThreshold": 80,
  "softLimit": true
}
```
**Response:**
```json
{
  "success": true,
  "limit": {
    "limittype": "user_seats",
    "limitvalue": 100,
    "alertthreshold": 80,
    "softlimit": true
  }
}
```

---

## Permission Management API

### Get User Permissions
**Endpoint:** `GET /api/permissions/users/:userId`  
**Auth:** SUPERADMIN or self  
**Description:** Get all effective permissions for a user  
**Response:**
```json
{
  "permissions": [
    {
      "id": "perm-123",
      "role": "COMPANY_ADMIN",
      "resource": "user",
      "action": "invite",
      "scope": "TENANT",
      "effect": "ALLOW"
    }
  ]
}
```

### Get Role Permissions
**Endpoint:** `GET /api/permissions/roles/:role`  
**Auth:** SUPERADMIN or COMPANY_OWNER  
**Description:** Get all permissions for a specific role  
**Response:**
```json
{
  "role": "COMPANY_ADMIN",
  "permissions": [
    {
      "resource": "user",
      "action": "invite",
      "scope": "TENANT",
      "effect": "ALLOW"
    }
  ]
}
```

---

## Health Check

### Health Status
**Endpoint:** `GET /api/health`  
**Auth:** None  
**Description:** Check API health and database connectivity  
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-28T05:00:00Z",
  "version": "2.0.0",
  "database": "connected"
}
```

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., slug already exists)
- `500` - Internal Server Error

### Common Error Codes
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `FEATURE_NOT_ENABLED` - Feature gate blocked access
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

All API endpoints are rate-limited:
- **Public endpoints:** 100 requests/minute
- **Authenticated endpoints:** 1000 requests/minute
- **SUPERADMIN endpoints:** 5000 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640707200
```

---

## Pagination

List endpoints support pagination:
```
GET /api/companies/all?page=1&perPage=50
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## WebSocket Events (Future)

Real-time updates via WebSocket connection:
- `company:created` - New company created
- `company:status_changed` - Status updated
- `feature:toggled` - Feature enabled/disabled
- `limit:exceeded` - Resource limit reached
- `user:invited` - User invitation sent
