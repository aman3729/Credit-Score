# 🚀 Production Readiness Checklist

This checklist ensures your application is secure, robust, and ready for production deployment. Review and complete each item before launch.

---

## 1. Environment Variables & Secrets
- [ ] `.env` and `.env.test` are **NOT** committed to git (`.env` is in `.gitignore`).
- [ ] All secrets (JWT, SMTP, DB, etc.) are set via environment variables in production.
- [ ] No default/fallback secrets are used in production.
- [ ] All required environment variables are documented in `.env.example`.

## 2. CORS Configuration
- [ ] CORS is **locked down** to trusted frontend origins in production (`CORS_ORIGINS`).
- [ ] No `*` wildcard CORS in production.

## 3. Email Verification
- [ ] `SKIP_EMAIL_VERIFICATION=false` and `REQUIRE_EMAIL_VERIFICATION=true` in production.
- [ ] A real SMTP provider is configured (not Gmail for production).

## 4. Demo/Test Users and Features
- [ ] Demo login buttons and test users are **removed** from the production database.
- [ ] No test/demo login endpoints or credentials are enabled in production.

## 5. User Account Security
- [ ] Strong password policy enforced (min length, complexity).
- [ ] User status is checked on login (block disabled/unverified users).
- [ ] Rate limiting is enabled for login attempts.

## 6. Session & JWT Security
- [ ] Cookies are set as `httpOnly` and `secure` in production.
- [ ] JWT expiration and rotation policies are set appropriately.

## 7. Database Security
- [ ] A dedicated production database is used.
- [ ] DB user permissions are restricted to only what's needed.
- [ ] Only app servers' IPs are whitelisted in MongoDB Atlas.

## 8. Logging & Monitoring
- [ ] Failed login attempts and security events are logged.
- [ ] Logs are monitored for suspicious activity.
- [ ] Error alerting (email, Slack, etc.) is set up for critical failures.

## 9. Dependency Security
- [ ] `npm audit` is run and all vulnerabilities are fixed.
- [ ] Dependencies are up to date.
- [ ] CI/CD fails on critical vulnerabilities.

## 10. Production Environment
- [ ] `NODE_ENV=production` is set in the production environment.
- [ ] The app is **never** run with `NODE_ENV=development` in production.

## 11. Frontend Security
- [ ] No secrets are exposed in frontend code.
- [ ] HTTPS is enforced for all API and frontend traffic.
- [ ] CORS and CSRF protection are tested with the deployed frontend.

## 12. Documentation
- [ ] All environment variables and deployment steps are documented.
- [ ] `.env.example` is provided for contributors.

## 13. Testing
- [ ] All tests are run against a clean test database before every deploy.
- [ ] All critical flows are tested: registration, login, password reset, email verification, admin actions.

## 14. Other Security Best Practices
- [ ] `helmet` is used for HTTP headers.
- [ ] All user input is sanitized.
- [ ] All admin endpoints require proper authentication and authorization.

---

**Final Step:**
- [ ] Review this checklist with your team before every production deployment.
- [ ] Update this checklist as your application evolves.

---

*Stay secure, stay reliable, and happy launching!* 