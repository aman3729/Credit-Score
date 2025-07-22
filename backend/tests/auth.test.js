import request from 'supertest';
import app from '../server.js';

describe('Auth API', () => {
  it('should reject login without CSRF token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/csrf/i);
  });

  it('should return error structure for invalid credentials', async () => {
    const agent = request.agent(app);
    // Get CSRF token
    const csrfRes = await agent.get('/api/v1/csrf-token');
    const csrfToken = csrfRes.body.csrfToken;
    // Attempt login with invalid credentials
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/invalid/i);
  });

  describe('Registration', () => {
    const testUser = {
      username: 'testuser_' + Date.now(),
      name: 'Test User',
      phoneNumber: '+12345678901',
      email: `testuser_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    it('should register a new user successfully', async () => {
      const agent = request.agent(app);
      const csrfRes = await agent.get('/api/v1/csrf-token');
      const csrfToken = csrfRes.body.csrfToken;
      const res = await agent
        .post('/api/v1/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send(testUser);
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toMatch(/success|ok/i);
      expect(res.body).toHaveProperty('data');
    });

    it('should not allow duplicate registration', async () => {
      const agent = request.agent(app);
      const csrfRes = await agent.get('/api/v1/csrf-token');
      const csrfToken = csrfRes.body.csrfToken;
      // Try to register the same user again
      const res = await agent
        .post('/api/v1/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send(testUser);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/already/i);
    });

    it('should return validation error for missing fields', async () => {
      const agent = request.agent(app);
      const csrfRes = await agent.get('/api/v1/csrf-token');
      const csrfToken = csrfRes.body.csrfToken;
      const res = await agent
        .post('/api/v1/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/required|invalid|missing/i);
    });
  });

  describe('Protected Routes', () => {
    it('should reject access to /api/v1/auth/me without login', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect([401, 403]).toContain(res.status);
      expect(res.body.status).toBe('error');
    });

    // Uncomment and adjust if you have a test user and login works
    // it('should allow access to /api/v1/auth/me after login', async () => {
    //   const agent = request.agent(app);
    //   const csrfRes = await agent.get('/api/v1/csrf-token');
    //   const csrfToken = csrfRes.body.csrfToken;
    //   await agent
    //     .post('/api/v1/auth/login')
    //     .set('X-CSRF-Token', csrfToken)
    //     .send({ identifier: 'validuser@example.com', password: 'validpassword' });
    //   const res = await agent.get('/api/v1/auth/me');
    //   expect(res.status).toBe(200);
    //   expect(res.body.status).toBe('success');
    //   expect(res.body.data).toHaveProperty('email');
    // });
  });
}); 