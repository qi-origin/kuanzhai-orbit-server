// 通过环境变量注入，默认值保证本地可直接运行
module.exports = {
  // BFF 端口（避开 OrbitAgent 的 3000）
  PORT: parseInt(process.env.PORT, 10) || 3001,

  // OrbitAgent 六爻服务
  AGENT_API_URL: process.env.AGENT_API_URL || 'http://127.0.0.1:3000',
  AGENT_API_KEY: process.env.AGENT_API_KEY || '',
  AGENT_TIMEOUT_MS: parseInt(process.env.AGENT_TIMEOUT_MS, 10) || 60_000,

  // 开发模式 — 是否通过 /dev/token 自动获取 Agent JWT
  AGENT_DEV_MODE: process.env.AGENT_DEV_MODE !== 'false',  // 默认 true
};
