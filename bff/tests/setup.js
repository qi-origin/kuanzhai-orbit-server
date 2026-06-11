require('dotenv').config({ path: '.env.test' });

const express = require('express');
const cors = require('cors');
const config = require('../src/config');
const errorHandler = require('../src/middleware/errorHandler');

// 创建测试 app（不启动服务器）
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 鉴权 — 白名单放行
  const authMiddleware = require('../src/middleware/auth');
  app.use((req, res, next) => {
    const whitelist = [
      'POST /api/v1/auth/mock-login',
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/invite',
      'GET /api/v1/health',
    ];
    if (req.path.startsWith('/api/v1/liuyao/')) return next();
    if (whitelist.includes(`${req.method} ${req.path}`)) return next();
    authMiddleware(req, res, next);
  });

  // 路由
  app.use('/api/v1', require('../src/routes/auth.routes'));
  app.use('/api/v1/rituals', require('../src/routes/ritual.routes'));
  app.use('/api/v1/me', require('../src/routes/me.routes'));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, message: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  // 404 handler — must be after all routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `路径 ${req.method} ${req.path} 不存在` },
    });
  });

  return app;
}

module.exports = { createTestApp };
