const { Router } = require('express');
const ctrl = require('../controllers/ritual.controller');
const router = Router();
router.post('/', ctrl.create);
router.post('/:sessionId/interpret', ctrl.interpret);
router.post('/:sessionId/followups', ctrl.addFollowup);
router.get('/:sessionId', ctrl.getDetail);
module.exports = router;
