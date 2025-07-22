# API Documentation

This document provides an overview of the major backend API endpoints, grouped by feature. For each endpoint, the route, HTTP method, and a brief description are provided.

---

## Authentication
- **POST /api/auth/login** — User login
- **POST /api/auth/register** — User registration
- **POST /api/auth/verify** — Email verification
- **POST /api/auth/forgot-password** — Request password reset
- **POST /api/auth/reset-password** — Reset password

## Users
- **GET /api/users** — List all users (admin)
- **GET /api/users/:id** — Get user details
- **POST /api/users** — Create a new user
- **PUT /api/users/:id** — Update user details
- **DELETE /api/users/:id** — Delete a user

## Credit Score
- **GET /api/credit-score** — Get current user's credit score
- **POST /api/credit-score/calculate** — Calculate credit score for uploaded data
- **GET /api/credit-score/history** — Get credit score history

## Loan
- **GET /api/loan/decisions** — List loan decisions
- **POST /api/loan/decisions** — Submit a loan decision
- **GET /api/loan/decisions/:id** — Get loan decision details

## Schema Mapping
- **GET /api/schema-mapping** — List schema mappings
- **POST /api/schema-mapping** — Create a new schema mapping
- **PUT /api/schema-mapping/:id** — Update a schema mapping
- **DELETE /api/schema-mapping/:id** — Delete a schema mapping

## Uploads
- **POST /api/upload** — Upload credit data file
- **GET /api/upload/history** — Get upload history

## Admin
- **GET /api/admin/audit-logs** — Get audit logs
- **GET /api/admin/analytics** — Get analytics data

---

> **Note:** This is a high-level overview. For detailed request/response formats and authentication requirements, see the relevant controller or route file in the backend. 