const { fail } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err);
  const statusCode = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? '服务器内部错误' : err.message;
  return fail(res, code, message, statusCode);
}

module.exports = errorHandler;
