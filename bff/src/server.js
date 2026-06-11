require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.path}  origin=${req.headers.origin || 'none'}`);
  next();
});

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'ok', timestamp: new Date().toISOString() });
});

// 鉴权 — 白名单放行
app.use((req, res, next) => {
  // liuyao/app/* 不鉴权（zhouyi_app 兼容层）
  if (req.path.startsWith('/api/v1/liuyao/')) return next();

  const whitelist = [
    'POST /api/v1/auth/mock-login',
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/login',
    'POST /api/v1/auth/invite',
    'GET /api/v1/health',
  ];
  if (whitelist.includes(`${req.method} ${req.path}`)) return next();
  authMiddleware(req, res, next);
});

// 路由
app.use('/api/v1', require('./routes/auth.routes'));  // /auth/* + /liuyao/app/*
app.use('/api/v1/rituals', require('./routes/ritual.routes'));
app.use('/api/v1/me', require('./routes/me.routes'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `路径 ${req.method} ${req.path} 不存在` } });
});

// 错误处理
app.use(errorHandler);

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 宽窄·Orbit BFF 已启动 → http://localhost:${config.PORT}`);
  console.log(`  📡 基础路径: /api/v1`);
  console.log(`  🔗 OrbitAgent: ${config.AGENT_API_URL}`);
  console.log(`  🧪 Dev 模式: ${config.AGENT_DEV_MODE ? '自动获取 Agent token' : '手动配置 AGENT_API_KEY'}\n`);
});
