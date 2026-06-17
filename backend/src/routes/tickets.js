const express = require('express');
const router = express.Router();
const { authenticate, authorize, ticketAccess, internalOnly } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  getTickets, getTicketById, createTicket, updateStatus, updateTicket,
  addProduct, removeProduct, addSolution, approveSolution, anonymizeTicket
} = require('../controllers/ticketController');
const pool = require('../config/database');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate);

// Statuses list — DEVE vir ANTES de /:id para não ser capturado pelo parâmetro dinâmico
router.get('/meta/statuses', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ticket_statuses ORDER BY sort_order');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/', getTickets);
router.post('/', createTicket);
router.get('/:id', ticketAccess, getTicketById);
router.patch('/:id', ticketAccess, updateTicket);
router.patch('/:id/status', ticketAccess, internalOnly, updateStatus);

// Products (escrita restrita a usuários internos)
router.post('/:id/products', ticketAccess, internalOnly, addProduct);
router.delete('/:id/products/:productId', ticketAccess, internalOnly, removeProduct);

// Solutions (proposta de solução restrita a usuários internos)
router.post('/:id/solutions', ticketAccess, internalOnly, addSolution);
router.patch('/:id/solutions/:solutionId/approve', ticketAccess, authorize('gestor', 'diretor'), approveSolution);

// LGPD
router.post('/:id/anonymize', ticketAccess, authorize('gestor', 'diretor'), anonymizeTicket);

// Attachments upload
router.post('/:id/attachments', ticketAccess, upload.array('files', 10), async (req, res, next) => {
  try {
    const { id } = req.params;
    const uploaded = [];
    for (const file of req.files) {
      const appUrl = process.env.APP_URL || 'http://177.153.39.134:5000';
      const relativePath = file.path.replace(path.join(__dirname, '../../'), '');
      const url = `${appUrl}/${relativePath}`;

      const { rows } = await pool.query(`
        INSERT INTO attachments (ticket_id, uploaded_by, filename, original_name, mime_type, size_bytes, url)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [id, req.user.id, file.filename, file.originalname, file.mimetype, file.size, url]);
      uploaded.push(rows[0]);
    }

    await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, new_value, is_internal)
      VALUES ($1,$2,'attachment',$3,TRUE)
    `, [id, req.user.id, `${req.files.length} arquivo(s) anexado(s)`]);

    res.status(201).json(uploaded);
  } catch (err) {
    next(err);
  }
});

// Blocks (escrita restrita a usuários internos)
router.post('/:id/blocks', ticketAccess, internalOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { block_type_id, content } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO ticket_blocks (ticket_id, block_type_id, content, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$4) RETURNING *
    `, [id, block_type_id, JSON.stringify(content || {}), req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/blocks/:blockId', ticketAccess, internalOnly, async (req, res, next) => {
  try {
    const { id, blockId } = req.params;
    const { content } = req.body;
    await pool.query(
      'UPDATE ticket_blocks SET content = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND ticket_id = $4',
      [JSON.stringify(content), req.user.id, blockId, id]
    );
    res.json({ message: 'Bloco atualizado' });
  } catch (err) { next(err); }
});

// Add internal/public note to history
router.post('/:id/notes', ticketAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'Nota é obrigatória' });
    // is_internal é derivado do perfil: cliente/loja NUNCA criam notas internas.
    // Usuários internos podem optar por nota pública passando is_internal: false.
    const internalRoles = ['atendente', 'gestor', 'diretor', 'superadmin'];
    const is_internal = internalRoles.includes(req.user.role)
      ? req.body.is_internal !== false
      : false;
    const { rows } = await pool.query(`
      INSERT INTO ticket_history (ticket_id, user_id, action_type, note, is_internal)
      VALUES ($1, $2, 'note', $3, $4) RETURNING *
    `, [id, req.user.id, note.trim(), is_internal]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
