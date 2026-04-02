const express = require('express');
const router = express.Router();
const { authenticate, internalOnly } = require('../middlewares/auth');
const { getTasks, getKanban, createTask, updateTask, deleteTask, getWhatsAppLink } = require('../controllers/taskController');

router.use(authenticate, internalOnly);
router.get('/', getTasks);
router.get('/kanban', getKanban);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/:id/whatsapp', getWhatsAppLink);

module.exports = router;
