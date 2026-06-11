/**
 * Agent 服务 — 对接 OrbitAgent 六爻后端
 * 首轮解读：GET /divination/reading/:sessionId（先用 chart 存，再 analyze）
 * 追问：重跑 analyze 带新问题
 */

const config = require('../config');
const crypto = require('crypto');

// ─── Agent JWT 缓存 ───────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0;

async function getAgentToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) return _cachedToken;
  const res = await fetch(`${config.AGENT_API_URL}/api/v1/dev/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`获取 Agent token 失败: ${res.status}`);
  const json = await res.json();
  _cachedToken = json.data.token;
  _tokenExpiresAt = Date.now() + 29 * 24 * 3600_000;
  return _cachedToken;
}

async function agentHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (config.AGENT_API_KEY) { h['Authorization'] = `Bearer ${config.AGENT_API_KEY}`; }
  else if (config.AGENT_DEV_MODE) { h['Authorization'] = `Bearer ${await getAgentToken()}`; }
  return h;
}

let _agentAvailable = null;
async function probeAgent() {
  if (_agentAvailable !== null) return _agentAvailable;
  try {
    const h = await agentHeaders();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${config.AGENT_API_URL}/api/v1/divination/cast`, {
      method: 'POST', headers: h, body: JSON.stringify({ bits: [1, 0, 1, 1, 0, 0] }), signal: ctrl.signal,
    });
    clearTimeout(t);
    _agentAvailable = res.ok;
  } catch { _agentAvailable = false; }
  return _agentAvailable;
}

// ─── 主入口 ──────────────────────────────────────────────────────

async function callInterpret(params) {
  const { question, questionTag, yaoValues, datetime } = params;

  if (!(await probeAgent())) {
    console.log('[AgentService] Agent 不可用，使用 mock');
    return mockResult(params);
  }

  try {
    const questionType = require('../store').TAG_TO_TYPE[questionTag] || '其他';
    const h = await agentHeaders();
    const sessionId = 'bff_' + crypto.randomUUID();

    // Step 1: 排盘
    const chartBody = JSON.stringify({ sessionId, yaoValues, question, questionType, datetime, timezone: 'Asia/Shanghai' });
    const chartRes = await fetch(`${config.AGENT_API_URL}/api/v1/divination/chart`, { method: 'POST', headers: h, body: chartBody, signal: AbortSignal.timeout(15_000) });
    if (!chartRes.ok) throw new Error(`chart ${chartRes.status}`);
    const chartData = (await chartRes.json()).data;
    // clean up MongoDB noise
    delete chartData.expiresAt;
    delete chartData.chartKey;
    delete chartData.casting;

    // Step 2: analyze
    const analyzeBody = JSON.stringify({ chart: chartData, debug: false, thinking: false });
    const analyzeRes = await fetch(`${config.AGENT_API_URL}/api/v1/divination/analyze`, { method: 'POST', headers: h, body: analyzeBody, signal: AbortSignal.timeout(config.AGENT_TIMEOUT_MS) });
    if (!analyzeRes.ok) throw new Error(`analyze ${analyzeRes.status}`);
    const analyzeData = (await analyzeRes.json()).data;

    return {
      mode: 'interpretation',
      needsClarification: (analyzeData.uncertainties || []).length > 0,
      agentSessionId: sessionId,
      hexagramSummary: {
        originalHexagram: chartData.originalHexagram || null,
        changedHexagram: (chartData.changedHexagram && chartData.changedHexagram.name !== chartData.originalHexagram?.name)
          ? chartData.changedHexagram
          : null,
        movingLines: (chartData.movingLines || []),
      },
      summary: analyzeData.summary || extractContent(analyzeData, '卦象概要') || '',
      body: formatReport(chartData, analyzeData),
      focusPoints: [],
      afterglow: '',
      followupDirections: [],
      microActions: [],
      riskLevel: 'low',
      warnings: analyzeData.uncertainties || [],
      communitySafeVersion: {
        title: `${questionTag} | ${(chartData.originalHexagram || {}).name || ''}`,
        content: analyzeData.summary || '',
      },
    };
  } catch (err) {
    console.error('[AgentService] 解读失败:', err.message);
    return mockResult(params, `Agent 解读失败: ${err.message}`);
  }
}

async function callFollowup(params) {
  const { message, question, questionTag, yaoValues, datetime } = params;
  if (!(await probeAgent())) return { mode: 'followup', body: '【Mock】Agent 不可用。' };
  try {
    // 重跑解析，把追问拼到问题上
    const combinedQuestion = `${question}。追问：${message}`;
    const result = await callInterpret({ question: combinedQuestion, questionTag, yaoValues, datetime });
    return { mode: 'followup', body: result.body };
  } catch (err) {
    return { mode: 'followup', body: `追问失败: ${err.message}` };
  }
}

/**
 * 直接调 Agent 的 /divination/ask 获取完整解读
 * （用于 zhouyi_app 兼容路由，跳过 chart+analyze 分步）
 */
async function directAsk(params) {
  const { yaoValues, question, questionTag, datetime } = params;
  if (!(await probeAgent())) return mockResult(params);
  try {
    const questionType = require('../store').TAG_TO_TYPE[questionTag] || '其他';
    const h = await agentHeaders();
    const body = JSON.stringify({ yaoValues, question, questionType, datetime, timezone: 'Asia/Shanghai', debug: false });
    const res = await fetch(`${config.AGENT_API_URL}/api/v1/divination/ask`, {
      method: 'POST', headers: h, body, signal: AbortSignal.timeout(config.AGENT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ask ${res.status}`);
    const d = (await res.json()).data;
    const chart = d.chart || {};
    return {
      mode: 'interpretation',
      needsClarification: (d.report?.uncertainties || []).length > 0,
      hexagramSummary: {
        originalHexagram: chart.originalHexagram || null,
        changedHexagram: (chart.changedHexagram && chart.changedHexagram.name !== chart.originalHexagram?.name)
          ? chart.changedHexagram
          : null,
        movingLines: (chart.movingLines || []),
      },
      summary: d.report?.summary || d.content?.slice(0, 200) || '',
      body: d.content || '',
      focusPoints: [],
      afterglow: '',
      followupDirections: [],
      microActions: [],
      riskLevel: 'low',
      warnings: d.report?.uncertainties || [],
      communitySafeVersion: {
        title: `${questionTag} | ${(chart.originalHexagram || {}).name || ''}`,
        content: d.report?.summary || '',
      },
    };
  } catch (err) {
    console.error('[AgentService] directAsk 失败:', err.message);
    return mockResult(params, `Agent 解读失败: ${err.message}`);
  }
}

// ─── 格式化 ──────────────────────────────────────────────────────
function formatReport(chart, report) {
  const lines = [];
  const orig = chart.originalHexagram || {};
  const changed = chart.changedHexagram || {};
  const moving = (chart.movingLines || []).join('、') || '无';

  lines.push(`# 六爻综合分析报告\n`);
  lines.push(`## ① 卦象概要`);
  lines.push(`本卦为**${orig.name || '?'}**（${orig.upper || '?'}上${orig.lower || '?'}下），属${orig.palace || '?'}宫${orig.palaceType || ''}，五行${orig.element || '?'}。`);
  if (changed.name && changed.name !== orig.name && moving !== '无') {
    lines.push(`变卦为**${changed.name}**。`);
  }
  lines.push(`动爻为第${moving}爻。\n`);

  // Append LLM content
  if (report.synthesis) lines.push(`## ⑧ 综合判断\n${report.synthesis}`);
  else if (typeof report === 'string') lines.push(report);

  if (report.uncertainties && report.uncertainties.length) {
    lines.push(`\n## 不确定性与补充信息\n${report.uncertainties.map(u => `- ${u}`).join('\n')}`);
  }

  return lines.join('\n');
}

function extractContent(report, section) {
  if (!report || typeof report !== 'object') return '';
  const val = report[section];
  return typeof val === 'string' ? val : '';
}

// ─── Mock ─────────────────────────────────────────────────────────
function mockResult(params, fallbackReason) {
  const { question, questionTag, yaoValues } = params;
  const moving = yaoValues.map((v, i) => (v % 2 === 0 ? i + 1 : null)).filter(Boolean);
  const hexNames = ['乾为天','坤为地','水雷屯','山水蒙','水天需','天水讼','地水师','水地比','风天小畜','天泽履','地天泰','天地否','天火同人','火天大有','地山谦','雷地豫'];
  const hexName = hexNames[yaoValues.reduce((s, v) => s + v, 0) % 16];

  if (fallbackReason) {
    return { mode: 'interpretation', needsClarification: true, hexagramSummary: { originalHexagram: { id: hexName, name: hexName, symbol: '' }, changedHexagram: null, movingLines: moving }, summary: fallbackReason, body: fallbackReason, focusPoints: [], afterglow: '', followupDirections: ['重试'], microActions: [], riskLevel: 'medium', warnings: [fallbackReason], communitySafeVersion: { title: '', content: '' } };
  }
  return { mode: 'interpretation', needsClarification: false, hexagramSummary: { originalHexagram: { id: hexName, name: hexName, symbol: '' }, changedHexagram: null, movingLines: moving }, summary: `【Mock】${hexName}`, body: `【Mock】问题：「${question}」 分类：${questionTag}`, focusPoints: [], afterglow: '', followupDirections: [], microActions: [], riskLevel: 'low', warnings: ['Mock'], communitySafeVersion: { title: '', content: '' } };
}

module.exports = { callInterpret, callFollowup, directAsk };
