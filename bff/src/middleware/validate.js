/**
 * 输入验证中间件 — 用 Joi schema 校验请求体
 */
const Joi = require('joi');

const schemas = {
  mockLogin: Joi.object({
    nickname: Joi.string().trim().min(1).max(50).required(),
  }),

  createRitual: Joi.object({
    question: Joi.string().trim().min(1).max(500).required(),
    questionTag: Joi.string().valid('relationship', 'career', 'wealth', 'health', 'exam', 'lost', 'travel', 'cooperate', 'lawsuit', 'pet', 'general').default('general'),
    lines: Joi.array().items(Joi.number().valid(0, 1)).length(6).required(),
    movingLines: Joi.array().items(Joi.number().integer().min(1).max(6)).max(6).required(),
    datetime: Joi.string().isoDate().optional(),
  }),

  followup: Joi.object({
    message: Joi.string().trim().min(1).max(500).required(),
  }),
};

function validate(schemaName) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Unknown validation schema: ${schemaName}`);

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: details },
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { validate };
