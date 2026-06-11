/**
 * 内存数据存储 — MVP 阶段。导出接口预留数据库替换。
 */
const { v4: uuidv4 } = require('uuid');

// ─── User ────────────────────────────────────────────────────────
const users = new Map();

const userStore = {
  create(nickname) {
    const id = uuidv4();
    const token = uuidv4();
    const user = { id, nickname, avatarUrl: '', createdAt: new Date().toISOString() };
    users.set(token, user);
    return { token, user };
  },
  findByToken(token) {
    return users.get(token) || null;
  },
};

// ─── Ritual ──────────────────────────────────────────────────────
const rituals = new Map();

/** lines(0/1) → yaoValues(6/7/8/9)
 *  OrbitAgent 的 castFromManual: bit 1→7(少阳), bit 0→8(少阴)。
 *  动爻由 movingLines 决定：阳爻(bit=1)→9(老阳), 阴爻(bit=0)→6(老阴) */
function bitsToYaoValues(lines, movingLines) {
  const movingSet = new Set(movingLines.map((n) => n - 1));
  return lines.map((bit, i) => {
    if (movingSet.has(i)) return bit === 1 ? 9 : 6;  // 老阳 / 老阴
    return bit === 1 ? 7 : 8;                         // 少阳 / 少阴
  });
}

/** questionTag(business) → OrbitAgent questionType */
const TAG_TO_TYPE = {
  relationship: '求感情', career: '求事业', wealth: '求财',
  health: '求健康', exam: '求考试', lost: '求失物',
  travel: '求出行', cooperate: '求合作', lawsuit: '求官司',
  pet: '求宠物', general: '其他',
};

const ritualStore = {
  create({ userId, question, questionTag, lines, movingLines, datetime }) {
    const sessionId = uuidv4();
    const yaoValues = bitsToYaoValues(lines, movingLines);
    const now = new Date().toISOString();
    const ritual = {
      sessionId, userId, question, questionTag,
      lines, movingLines, yaoValues,            // 保留 business 层 + Agent 层两套表示
      datetime: datetime || now,
      // OrbitAgent 返回的数据
      agentSessionId: null,                     // Agent 侧 chat sessionId
      interpretation: null,
      followups: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    rituals.set(sessionId, ritual);
    return ritual;
  },
  findById(sessionId) { return rituals.get(sessionId) || null; },
  update(sessionId, patch) {
    const r = rituals.get(sessionId);
    if (!r) return null;
    Object.assign(r, patch, { updatedAt: new Date().toISOString() });
    return r;
  },
  addFollowup(sessionId, { message, result }) {
    const r = rituals.get(sessionId);
    if (!r) return null;
    const f = { id: uuidv4(), message, result, createdAt: new Date().toISOString() };
    r.followups.push(f);
    r.updatedAt = new Date().toISOString();
    return f;
  },
  findByUserId(userId) {
    return [...rituals.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  },
};

module.exports = { userStore, ritualStore, TAG_TO_TYPE };
