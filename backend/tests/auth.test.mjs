import request from 'supertest';
import app from '../server.js';

describe('Auth API', () => {
  it('should reject login without CSRF token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Accept', 'application/json')
      .send({ identifier: 'user@example.com', password: 'wrong' });
    console.log('CSRF test response:', res.body, res.text);
    console.log('CSRF test headers:', res.headers);
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('error');
    expect(res.body.message.toLowerCase()).toMatch(/csrf/);
  });

  it('should return error structure for invalid credentials', async () => {
    const agent = request.agent(app);
    // Get CSRF token
    const csrfRes = await agent.get('/api/v1/csrf-token');
    const csrfToken = csrfRes.body.csrfToken;
    // Attempt login with invalid credentials
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'user@example.com', password: 'wrong' });
    console.log('Invalid credentials test response:', res.body, res.text);
    console.log('Invalid credentials test headers:', res.headers);
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/invalid/i);
  }, 15000);
});

describe('Sanity check', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });
}); 