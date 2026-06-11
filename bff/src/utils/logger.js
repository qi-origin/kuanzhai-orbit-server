/**
 * 结构化日志 — 用 pino 替代 console.log
 */
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  base: { pid: process.pid },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

module.exports = logger;
