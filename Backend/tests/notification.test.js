const request = require('supertest');
const app = require('../src/server');

// Note: This test is scaffolded and may require a running test DB and test user setup.
// It demonstrates basic usage with supertest. For CI, replace with in-memory mongo or test fixtures.

describe('Notifications API', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.statusCode).toBe(401);
  });
});
