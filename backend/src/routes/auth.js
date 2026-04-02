const express = require('express');
const router = express.Router();
const { login, register, me, changePassword, getDepartments } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

router.get('/departments', getDepartments);
router.post('/login', login);
router.post('/register', authenticate, register);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
