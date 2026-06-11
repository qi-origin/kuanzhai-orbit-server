/**
 * BFF 登录接口 — 直接绕过 OrbitAgent 的 invite code 机制
 * 提供给 Web 前端一个简单的入口
 */
const { userStore } = require('../store');
const { ok, fail } = require('../utils/response');
const config = require('../config');

/**
 * 登录：接收昵称，返回 BFF token
 * Web 前端可以通过这个 token 调用 BFF 所有接口
 */
function mockLogin(req, res) {
  const { nickname } = req.body || {};
  if (!nickname || !nickname.trim()) return fail(res, 'INVALID_PARAM', 'nickname 不能为空', 400);
  const { token, user } = userStore.create(nickname.trim());
  return ok(res, { token, user }, '登录成功');
}

/**
 * 邀请码登录 — 对接 OrbitAgent 的 invite code 机制
 */
async function inviteLogin(req, res) {
  const { code, deviceId } = req.body || {};
  if (!code || !deviceId) return fail(res, 'INVALID_PARAM', 'code 和 deviceId 不能为空', 400);

  try {
    // BFF 转发到 OrbitAgent 验证邀请码
    const response = await fetch(`${config.AGENT_API_URL}/api/v1/auth/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      return fail(res,
        result.error?.code || 'INVITE_FAILED',
        result.error?.message || '邀请码无效',
        response.status || 401,
      );
    }

    // OrbitAgent 返回的是 { token, user }，但我们 Web 前端需要 accessToken
    const data = result.data || result;
    return ok(res, {
      token: data.token || data.accessToken,
      user: data.user,
    }, '登录成功');
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
      return fail(res, 'AGENT_OFFLINE', '验证服务未启动，请先启动 OrbitAgent', 502);
    }
    console.error('[inviteLogin]', err);
    return fail(res, 'AGENT_ERROR', err.message || '验证服务异常', 502);
  }
}

module.exports = { mockLogin, inviteLogin };
