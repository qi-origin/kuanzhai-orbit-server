const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const ritualCtrl = require('../controllers/ritual.controller');

const router = Router();

// ─── zhouyi_app 兼容路由 ─────────────────────────────────────────

// /liuyao/app/health
router.get('/liuyao/app/health', (_req, res) => {
  res.json({ success: true, message: 'ok', timestamp: new Date().toISOString() });
});

// /liuyao/app/chat/start → 直接调 Agent 的 /divination/ask 获取完整解读
router.post('/liuyao/app/chat/start', async (req, res, next) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const { question, lines, movingLines, datetime } = req.body || {};

    // 创建 BFF 仪式记录
    const ritual = require('../services/ritual.service').create({
      userId,
      question: question || '',
      questionTag: 'general',
      lines: lines || [1,0,1,0,1,1],
      movingLines: movingLines || [],
      datetime: datetime || new Date().toISOString(),
    });

    // 直接调 Agent 的 /ask 获取完整 LLM 解读
    const agentResult = await require('../services/agent.service').directAsk({
      yaoValues: ritual.yaoValues,
      question: ritual.question,
      questionTag: ritual.questionTag,
      datetime: ritual.datetime,
    });

    // 保存解读到 BFF
    require('../store').ritualStore.update(ritual.sessionId, {
      interpretation: agentResult,
      status: 'completed',
    });

    res.json({
      success: true,
      data: {
        mode: 'interpretation',
        needsClarification: agentResult.needsClarification || false,
        session: {
          sessionId: ritual.sessionId,
          createdAt: ritual.createdAt,
          updatedAt: new Date().toISOString(),
        },
        summary: {
          originalHexagram: agentResult.hexagramSummary?.originalHexagram || null,
          changedHexagram: agentResult.hexagramSummary?.changedHexagram || null,
          movingLines: agentResult.hexagramSummary?.movingLines || [],
        },
        reply: { text: agentResult.body || '', model: 'glm-4-flash-250414' },
        evaluation: {
          confidence: 'high',
          suggestedQuestionType: 'general',
          reasons: [],
          warnings: agentResult.warnings || [],
        },
      },
    });
  } catch (err) { next(err); }
});

// /liuyao/app/chat/continue → BFF 追问
router.post('/liuyao/app/chat/continue', async (req, res, next) => {
  try {
    const { sessionId, message } = req.body || {};
    const result = await require('../services/ritual.service').addFollowup(
      sessionId,
      req.user?.id || 'anonymous',
      message,
    );
    res.json({
      success: true,
      data: {
        session: { sessionId, updatedAt: new Date().toISOString() },
        reply: { text: result.result.body || '', model: 'glm-4-flash-250414' },
      },
    });
  } catch (err) { next(err); }
});

// /liuyao/app/chat/session/:sessionId
router.get('/liuyao/app/chat/session/:sessionId', (req, res, next) => {
  try {
    const ritual = require('../services/ritual.service').getDetail(
      req.params.sessionId,
      req.user?.id || 'anonymous',
    );
    res.json({
      success: true,
      data: {
        sessionId: ritual.sessionId,
        createdAt: ritual.createdAt,
        updatedAt: ritual.updatedAt,
        historyLength: (ritual.followups?.length || 0) + 1,
      },
    });
  } catch (err) { next(err); }
});

// ─── 原有路由 ─────────────────────────────────────────────────────
router.post('/auth/mock-login', ctrl.mockLogin);
router.post('/auth/invite', ctrl.inviteLogin);

module.exports = router;
