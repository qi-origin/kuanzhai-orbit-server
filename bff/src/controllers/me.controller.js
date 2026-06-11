const ritualService = require('../services/ritual.service');
const { ok } = require('../utils/response');

function getRitualRecords(req, res, next) {
  try {
    const records = ritualService.getRecords(req.user.id);
    return ok(res, { total: records.length, items: records });
  } catch (err) { next(err); }
}

module.exports = { getRitualRecords };
