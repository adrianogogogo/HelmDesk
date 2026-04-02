const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { search, suggest } = require('../controllers/searchController');
router.use(authenticate);
router.get('/', search);
router.get('/suggest', suggest);
module.exports = router;
