const { ritualStore } = require('../store');
const { callInterpret, callFollowup } = require('./agent.service');

const ritualService = {
  create({ userId, question, questionTag, lines, movingLines, datetime }) {
    if (!question || !question.trim()) throw mkErr(400, 'INVALID_PARAM', '问题不能为空');
    if (!Array.isArray(lines) || lines.length !== 6) throw mkErr(400, 'INVALID_PARAM', '需要6位爻值 [1,0,1,1,0,0]');
    if (!Array.isArray(movingLines)) throw mkErr(400, 'INVALID_PARAM', '动爻格式错误');

    return ritualStore.create({
      userId, question: question.trim(),
      questionTag: questionTag || 'general',
      lines, movingLines,
      datetime: datetime || new Date().toISOString(),
    });
  },

  async interpret(sessionId, userId) {
    const r = ritualStore.findById(sessionId);
    if (!r) throw mkErr(404, 'NOT_FOUND', '会话不存在');
    if (r.userId !== userId) throw mkErr(403, 'FORBIDDEN', '无权访问');
    if (r.status === 'interpreting') throw mkErr(409, 'CONFLICT', '解读进行中');

    ritualStore.update(sessionId, { status: 'interpreting' });

    let result;
    try {
      result = await callInterpret({
        question: r.question, questionTag: r.questionTag,
        yaoValues: r.yaoValues, datetime: r.datetime,
      });
      ritualStore.update(sessionId, {
        interpretation: result,
        agentSessionId: result.agentSessionId || null,
        status: 'completed',
      });
    } catch (e) {
      ritualStore.update(sessionId, { status: 'failed' });
      throw e;
    }
    return result;
  },

  async addFollowup(sessionId, userId, message) {
    const r = ritualStore.findById(sessionId);
    if (!r) throw mkErr(404, 'NOT_FOUND', '会话不存在');
    if (r.userId !== userId) throw mkErr(403, 'FORBIDDEN', '无权访问');
    if (!message || !message.trim()) throw mkErr(400, 'INVALID_PARAM', '追问内容不能为空');

    const context = [
      ...(r.interpretation ? [{ role: 'agent', message: r.interpretation.summary || r.interpretation.body?.slice(0, 500) || '' }] : []),
      ...r.followups.slice(-4).map((f) => ({ role: 'user', message: f.message })),
    ];

    const result = await callFollowup({
      agentSessionId: r.agentSessionId || sessionId,
      message: message.trim(),
      context,
      question: r.question,
      questionTag: r.questionTag,
      yaoValues: r.yaoValues,
      datetime: r.datetime,
    });

    const followup = ritualStore.addFollowup(sessionId, { message: message.trim(), result });
    return { followup, result };
  },

  getDetail(sessionId, userId) {
    const r = ritualStore.findById(sessionId);
    if (!r) throw mkErr(404, 'NOT_FOUND', '会话不存在');
    if (r.userId !== userId) throw mkErr(403, 'FORBIDDEN', '无权访问');
    return r;
  },

  getRecords(userId) { return ritualStore.findByUserId(userId); },
};

function mkErr(status, code, message) {
  const e = new Error(message); e.status = status; e.code = code; return e;
}

module.exports = ritualService;
