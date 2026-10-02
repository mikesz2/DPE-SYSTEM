const router = require('express').Router();
const { asyncRoute } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const passwordReset = require('../controllers/password-reset.controller');

// Login/registro tentam batidas de força bruta — limite mais apertado que o resto da API.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/habbo/start', authLimiter, asyncRoute(ctrl.startVerification));
router.post('/habbo/check', authLimiter, asyncRoute(ctrl.checkVerification));
router.post('/register', authLimiter, asyncRoute(ctrl.register));
router.post('/login', authLimiter, asyncRoute(ctrl.login));
router.post('/password-reset/start', authLimiter, asyncRoute(passwordReset.start));
router.post('/password-reset/complete', authLimiter, asyncRoute(passwordReset.complete));
router.get('/me', requireAuth, asyncRoute(ctrl.me));
router.patch('/password', requireAuth, asyncRoute(ctrl.changePassword));

module.exports = router;
