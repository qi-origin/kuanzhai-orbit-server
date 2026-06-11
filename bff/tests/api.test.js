const request = require('supertest');
const { createTestApp } = require('./setup');

let app;
let token;

beforeAll(() => {
  app = createTestApp();
});

describe('Auth API', () => {
  describe('POST /api/v1/auth/mock-login', () => {
    it('should login with valid nickname', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mock-login')
        .send({ nickname: '测试用户' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.nickname).toBe('测试用户');
      token = res.body.data.token;
    });

    it('should reject empty nickname', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mock-login')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject whitespace-only nickname', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mock-login')
        .send({ nickname: '   ' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});

describe('Rituals API', () => {
  // 每个测试前获取新 token
  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/auth/mock-login')
      .send({ nickname: 'test' });
    token = res.body.data.token;
  });

  describe('POST /api/v1/rituals', () => {
    it('should create a ritual session', async () => {
      const res = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: '我的事业运势如何？',
          questionTag: 'career',
          lines: [1, 0, 1, 0, 1, 1],
          movingLines: [3],
          datetime: '2026-06-09T10:00:00+08:00',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeTruthy();
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.yaoValues).toHaveLength(6);
    });

    it('should reject missing question', async () => {
      const res = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ lines: [1, 0, 1, 0, 1, 1], movingLines: [3] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid lines length', async () => {
      const res = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'test', lines: [1, 0, 1], movingLines: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/rituals')
        .send({ question: 'test', lines: [1, 0, 1, 0, 1, 1], movingLines: [] })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/rituals/:id/interpret', () => {
    it('should interpret (mock mode)', async () => {
      // 创建 ritual
      const createRes = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '事业运势', questionTag: 'career', lines: [1, 0, 1, 0, 1, 1], movingLines: [3] });
      const sessionId = createRes.body.data.sessionId;

      // 解读
      const res = await request(app)
        .post(`/api/v1/rituals/${sessionId}/interpret`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mode).toBe('interpretation');
      expect(res.body.data.body).toBeTruthy();
    });

    it('should reject non-existent session', async () => {
      const res = await request(app)
        .post('/api/v1/rituals/nonexistent-id/interpret')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should reject cross-user access', async () => {
      // 用户A创建
      const resA = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'testA', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
      const sid = resA.body.data.sessionId;

      // 用户B登录
      const resB = await request(app)
        .post('/api/v1/auth/mock-login')
        .send({ nickname: 'userB' });
      const tokenB = resB.body.data.token;

      // 用户B不能解读A的会话
      const res = await request(app)
        .post(`/api/v1/rituals/${sid}/interpret`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/rituals/:id/followups', () => {
    it('should add followup', async () => {
      const createRes = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'test', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
      const sid = createRes.body.data.sessionId;

      const res = await request(app)
        .post(`/api/v1/rituals/${sid}/followups`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '我该怎么办？' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.followup).toBeTruthy();
      expect(res.body.data.result).toBeTruthy();
    });

    it('should reject empty message', async () => {
      const createRes = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'test', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
      const sid = createRes.body.data.sessionId;

      const res = await request(app)
        .post(`/api/v1/rituals/${sid}/followups`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/rituals/:id', () => {
    it('should get ritual detail', async () => {
      const createRes = await request(app)
        .post('/api/v1/rituals')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'detail test', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
      const sid = createRes.body.data.sessionId;

      const res = await request(app)
        .get(`/api/v1/rituals/${sid}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.question).toBe('detail test');
      expect(res.body.data.status).toBeDefined();
    });
  });
});

describe('Me API', () => {
  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/auth/mock-login')
      .send({ nickname: 'history-test' });
    token = res.body.data.token;

    // 创建一个 ritual
    await request(app)
      .post('/api/v1/rituals')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'test record', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
  });

  describe('GET /api/v1/me/ritual-records', () => {
    it('should return user history', async () => {
      const res = await request(app)
        .get('/api/v1/me/ritual-records')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });
});

describe('Liuyao Compat Routes', () => {
  describe('GET /api/v1/liuyao/app/health', () => {
    it('should return health without auth', async () => {
      const res = await request(app)
        .get('/api/v1/liuyao/app/health')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/liuyao/app/chat/start', () => {
    it('should start chat without auth', async () => {
      const res = await request(app)
        .post('/api/v1/liuyao/app/chat/start')
        .send({ question: '事业运势', lines: [1, 0, 1, 0, 1, 1], movingLines: [3] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mode).toBe('interpretation');
      expect(res.body.data.reply.text).toBeTruthy();
    });
  });

  describe('POST /api/v1/liuyao/app/chat/continue', () => {
    it('should continue chat', async () => {
      const startRes = await request(app)
        .post('/api/v1/liuyao/app/chat/start')
        .send({ question: '运势', lines: [1, 0, 1, 0, 1, 1], movingLines: [] });
      const sid = startRes.body.data.session.sessionId;

      const res = await request(app)
        .post('/api/v1/liuyao/app/chat/continue')
        .send({ sessionId: sid, message: '继续追问' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reply.text).toBeTruthy();
    });
  });
});

describe('Error Handling', () => {
  let testToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/mock-login')
      .send({ nickname: 'err-test' });
    testToken = res.body.data.token;
  });

  it('should return 404 for unknown API routes', async () => {
    const res = await request(app)
      .get('/api/v1/a-route-that-does-not-exist')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return JSON error format', async () => {
    const res = await request(app)
      .get('/api/v1/a-route-that-does-not-exist')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(404);

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
  });
});
