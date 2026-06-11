const { Router } = require('express');
const ctrl = require('../controllers/me.controller');
const router = Router();
router.get('/ritual-records', ctrl.getRitualRecords);
module.exports = router;
