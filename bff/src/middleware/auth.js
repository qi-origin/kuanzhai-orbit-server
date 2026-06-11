const { userStore } = require('../store');
const { fail } = require('../utils/response');

/**
 * 鉴权中间件 — 同时接受 BFF 自己的 token 和 OrbitAgent 的 JWT
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    // zhouyi_app 的 liuyao/app/* 不强制鉴权
    if (req.path.startsWith('/liuyao/')) {
      req.user = { id: 'guest', nickname: 'guest', avatarUrl: '', createdAt: new Date().toISOString() };
      req.token = 'guest-token';
      return next();
    }
    return fail(res, 'UNAUTHORIZED', '缺少认证信息', 401);
  }

  const token = header.slice(7);

  // 1. 先查 BFF 自己的 userStore（mock-login 用户）
  const localUser = userStore.findByToken(token);
  if (localUser) {
    req.user = localUser;
    req.token = token;
    return next();
  }

  // 2. 不是 BFF token → 当作 Agent JWT 放行
  // JWT 格式：三段 base64，用 . 分隔
  if (token.split('.').length === 3) {
    // 解码 payload 拿 userId 和 email
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
      req.user = {
        id: payload.userId || 'agent-user',
        email: payload.email || '',
        nickname: payload.email || 'Agent User',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
      };
      req.token = token;
      return next();
    } catch (_) {
      // 解码失败，继续返回 401
    }
  }

  return fail(res, 'UNAUTHORIZED', 'token 无效或已过期', 401);
}

module.exports = authMiddleware;
