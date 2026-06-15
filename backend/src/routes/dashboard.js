const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { getDashboard } = require('../controllers/dashboardController');
router.get('/', authenticate, authorize('atendente', 'gestor', 'diretor'), getDashboard);
module.exports = router;
