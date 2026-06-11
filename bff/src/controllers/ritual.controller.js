const ritualService = require('../services/ritual.service');
const { ok } = require('../utils/response');

function create(req, res, next) {
  try {
    const { question, questionTag, lines, movingLines, datetime } = req.body || {};
    const ritual = ritualService.create({ userId: req.user.id, question, questionTag, lines, movingLines, datetime });
    return ok(res, {
      sessionId: ritual.sessionId, status: ritual.status,
      yaoValues: ritual.yaoValues,     // 传给 Flutter 确认排盘结果
      createdAt: ritual.createdAt,
    }, '会话创建成功', 201);
  } catch (err) { next(err); }
}

async function interpret(req, res, next) {
  try {
    const result = await ritualService.interpret(req.params.sessionId, req.user.id);
    return ok(res, result, '解读完成');
  } catch (err) { next(err); }
}

async function addFollowup(req, res, next) {
  try {
    const { message } = req.body || {};
    const data = await ritualService.addFollowup(req.params.sessionId, req.user.id, message);
    return ok(res, data, '追问完成');
  } catch (err) { next(err); }
}

function getDetail(req, res, next) {
  try {
    const ritual = ritualService.getDetail(req.params.sessionId, req.user.id);
    return ok(res, ritual);
  } catch (err) { next(err); }
}

module.exports = { create, interpret, addFollowup, getDetail };
