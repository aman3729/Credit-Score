# Credit Score Dashboard — Technical Overview

This document provides a concise, engineering-focused overview of the system: architecture, major features, key modules, interfaces, security posture, environments, and operational practices.

## System Architecture
- __Frontend__: React (Vite) app in `frontend/`.
  - API client: `frontend/src/lib/api.js`
  - Feature UIs: `frontend/src/components/*`
  - Auth/State: `frontend/src/contexts/*`
- __Backend__: Node.js/Express in `backend/`.
  - App bootstrap: `backend/src/app.js`
  - Routes: `backend/routes/*` (e.g., `auth.js`, `schemaMappingRoutes.js`)
  - Controllers: `backend/controllers/*` (e.g., `authController.js`, `loanController.js`)
  - Middleware: `backend/middleware/*` (e.g., `auth.js`, `rateLimiter.js`)
  - Models/Schemas: `backend/models/*`, `backend/schemas/*`
- __Database__: MongoDB via Mongoose (see models under `backend/models/`).
- __Messaging/Realtime__: Socket.IO (client: `frontend/src/contexts/WebSocketContext.jsx`).
- __Email__: SMTP-based in `backend/config/email.js` with template helpers.

## Authentication & Authorization
- __Auth model__: JWT-based session stored in __httpOnly cookies__ set by the backend.
  - Token issuance: `createSendToken()` in `backend/controllers/authController.js` sets `jwt` cookie.
  - Cookie flags: `httpOnly: true`, `secure: production`, `sameSite: strict (prod) | lax (dev)`.
- __Frontend__: No tokens in localStorage. Requests rely on browser cookies with `withCredentials`.
  - API client: `axios` instance in `frontend/src/lib/api.js` with `withCredentials: true`.
- __Auth middleware__: `backend/middleware/auth.js` (`protect`) extracts JWT from cookies and validates user and status.
- __Roles__: User roles (e.g., `user`, `premium`, `lender`, `admin`, `analyst`) enforced at route/controller level.
- __CSRF__: CSRF token support expected via `X-CSRF-Token` header for state-changing requests (see `frontend/src/services/csrfService` usage in `api.js`). Ensure backend CSRF middleware is enabled with appropriate exemptions (auth callbacks, uploads).

## CORS & Security Middleware
- __CORS__: Strict allowlist in production.
  - Origin list from `CORS_ORIGINS` env var in `backend/src/app.js`. Production fails-closed if missing.
  - Credentials enabled (cookies). No origin-mirroring or `*` in production.
- __Headers & hardening__: Helmet, HPP, XSS filtering, NoSQL injection mitigations (e.g., `xss-clean`, `mongoSanitize`) configured in `backend/src/app.js`.
- __Rate limiting__: See `backend/middleware/rateLimiter.js`; applied to auth-sensitive routes.
- __Logging hygiene__: Sensitive fields are not logged; logs are reduced in production.

## API Surface (Selected)
- `POST /api/v1/auth/register` — New user registration. Validates schema; triggers verification email.
- `POST /api/v1/auth/login` — Issues JWT httpOnly cookie on success.
- `GET /api/v1/auth/verify-token` — Validates cookie-based session.
- `POST /api/v1/auth/forgot-password` — Sends one-time code via email.
- `POST /api/v1/auth/reset-password` — Resets password using code.
- `GET /api/v1/auth/me` — Returns the current user profile.
- `GET /api/v1/auth/user-profile` — Detailed current user info.
- `GET /api/v1/auth/check-email?email=...` — Email availability check.
- Admin-specific routes (e.g., user approval, impersonation) in `backend/routes/auth.js`; access gated by role and `protect`.
- Loan/credit and schema mapping endpoints live under `backend/controllers/loanController.js` and `backend/routes/schemaMappingRoutes.js` respectively.

## Frontend Feature Map
- __Admin Dashboard__: `frontend/src/components/AdminDashboard.jsx`
  - Panels: user management, approvals, uploads, analytics, audit logs, security, scoring controls, etc.
  - Uses `api` and feature-specific endpoints; relies on cookie-based auth.
- __Pricing & Plans__: `frontend/src/components/PricingPlans.jsx`
  - Payment initiation and status polling using `fetch(..., { credentials: 'include' })`.
- __Security Alerts__: `frontend/src/components/SecurityAlerts.jsx`
  - Surfaces security and operational advisories to admins/users.
- __Register/Login__: `frontend/src/components/Register.jsx` and related auth flows.
- __WebSocket__: `frontend/src/contexts/WebSocketContext.jsx` uses Socket.IO with `withCredentials` for server-side session auth.

## Data Models (Illustrative)
- __User__: Identity, role, email verification state, status flags, security fields, timestamps.
- __Loan/Credit Data__: In `backend/schemas/creditDataSchema.js` and models in `backend/models/` define domain-specific structures.
- __Audit Logs__: Admin/user actions captured for observability and compliance (see `admin` panels and backend logging/DB schema if present).

## Errors & Observability
- __Error handling__: Central error handler pattern using `AppError` (`backend/utils/appError.js`) and Express error middleware.
- __Logging__: Console logging gated in production; avoid PII; structured logs for key events (auth, email, payments).
- __Request IDs__: `X-Request-ID` added by frontend client for traceability; mirror in backend logging/captures as needed.

## Realtime (Socket.IO)
- Client connects with `withCredentials: true` and supports `websocket` and `polling` transports.
- Server must enable CORS with credentials and the same allowlist as REST; session derived from cookies.

## Payments (Example: Telebirr integration)
- Client initiates payment and polls status via cookie-authenticated endpoints.
- Backend payment routes should validate session and perform provider webhook verification before marking `completed`.
- Sensitive data redaction and idempotency keys recommended.

## Build & Deployment
- __Frontend__: Vite build to `dist/`. Ensure `dist/` is not committed; built in CI/CD.
- __Backend__: Node runtime; configure environment via secrets (no secrets in repo). Start script boots `backend/src/app.js`.
- __Env Management__: `.env*` are ignored by VCS. Use deployment secrets for:
  - `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_EXPIRES_IN`
  - `CORS_ORIGINS` (comma-separated in prod)
  - SMTP credentials for email, CSRF/Session settings
  - Database URI and credentials
- __Process Management__: Use a process manager (PM2, systemd, containers) with health checks.

## Security Posture (Key Decisions)
- __Auth cookies only__: No tokens in localStorage/sessionStorage. All requests use cookies.
- __CORS allowlist__: Strict in production; app fails to start if `CORS_ORIGINS` missing.
- __CSRF__: Required on mutating routes; frontend adds `X-CSRF-Token` when provided.
- __Rate limiting__: Applied to auth and sensitive flows.
- __Input validation__: `express-validator` in route layers (e.g., `register` fields). Additional schema validations server-side.
- __Sanitized logging__: No PII/credentials; dev-mode logs only for diagnostics.

## Dependency & Vulnerability Management
- Run `npm audit` in both `backend/` and `frontend/`; apply minimally disruptive updates.
- Add CI secret scanning (Gitleaks/TruffleHog) and dependency scanning.

## Testing & QA
- __Unit/Integration__: Add tests for auth, CORS, CSRF, and critical controllers (e.g., `loanController`).
- __E2E__: Validate signup/login, cookie flows, admin actions, payments, and WebSocket events.
- __Security tests__: CSRF, CORS, cookie security, rate limiting, input validation, and log hygiene.

## Operational Runbook (Essentials)
- __Config__: Verify `CORS_ORIGINS`, database, SMTP, JWT secrets on boot.
- __Monitoring__: Track 4xx/5xx rates, auth failures, rate limiting hits, email send failures, payment status anomalies.
- __Rotation__: Rotate credentials on leak indicators; tokens are short-lived and cookie-bound.
- __Backups__: Ensure database backups and test restores.

## File Pointers (Non-exhaustive)
- Backend
  - `backend/src/app.js` — Express initialization, security middleware, CORS policy, routers.
  - `backend/routes/auth.js` — Auth endpoints, login/register, email verification, admin actions.
  - `backend/middleware/auth.js` — `protect` middleware for JWT in cookies.
  - `backend/controllers/*` — Business logic (e.g., `loanController.js`, `authController.js`).
  - `backend/config/email.js` — SMTP transport and `emailTemplates`.
  - `backend/schemas/*`, `backend/models/*` — Data contracts and Mongoose models.
- Frontend
  - `frontend/src/lib/api.js` — Axios client with `withCredentials`, CSRF token integration, interceptors.
  - `frontend/src/contexts/AuthContext` — App auth state (no tokens stored in web storage).
  - `frontend/src/contexts/WebSocketContext.jsx` — Socket.IO client using cookies.
  - `frontend/src/components/*` — Feature UIs (e.g., `AdminDashboard.jsx`, `PricingPlans.jsx`, `SecurityAlerts.jsx`).

---

If deeper implementation details are needed for any module or feature, contact the engineering team with the exact path (e.g., `backend/routes/auth.js` or `frontend/src/components/AdminDashboard.jsx`) and we can provide a focused deep dive.
