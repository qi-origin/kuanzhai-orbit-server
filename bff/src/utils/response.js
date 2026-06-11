/**
 * 统一 JSON 响应结构
 */
function ok(res, data = null, message = 'ok', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function fail(res, code, message, statusCode = 400, details = null) {
  const body = { success: false, error: { code, message } };
  if (details !== null) body.error.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { ok, fail };
