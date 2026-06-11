/**
 * 简易 rate limiter — 防止过度调用
 */
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 分钟窗口
  max: 60,               // 最多 60 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后重试' },
  },
});

const interpretLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,               // AI 解读接口更严格：每分钟最多 10 次
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: '解读请求过于频繁，请稍后重试' },
  },
});

module.exports = { apiLimiter, interpretLimiter };
