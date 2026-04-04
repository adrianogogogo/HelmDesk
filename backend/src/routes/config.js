const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');
const { sendEmail, getEmailConfig } = require('../services/emailService');

// GET /api/config/block-types (MUST be before /:key)
router.get('/block-types', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM block_types WHERE is_active=TRUE ORDER BY sort_order');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/config/block-types
router.post('/block-types', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, slug, icon, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO block_types (name, slug, icon, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, slug, icon, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/config/block-types/:id
router.patch('/block-types/:id', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, slug, icon, description } = req.body;
    await pool.query(
      `UPDATE block_types SET name=COALESCE($1,name), slug=COALESCE($2,slug),
       icon=COALESCE($3,icon), description=COALESCE($4,description) WHERE id=$5`,
      [name, slug, icon, description, req.params.id]
    );
    res.json({ message: 'Tipo de bloco atualizado' });
  } catch (err) { next(err); }
});

// GET /api/config
router.get('/', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM system_configs ORDER BY category, key');
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/config/:key
router.patch('/:key', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { value } = req.body;
    await pool.query(
      `INSERT INTO system_configs (key, value, updated_by, updated_at) VALUES ($3, $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_by=$2, updated_at=NOW()`,
      [value, req.user.id, req.params.key]
    );
    res.json({ message: 'Configuração salva' });
  } catch (err) { next(err); }
});

// POST /api/config/issue-types (full management)
router.post('/issue-types', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO issue_types (name, department_id) VALUES ($1,$2) RETURNING *',
      [name, department_id || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── Email config routes ──────────────────────────────────────

// GET /api/config/email — retorna config SMTP atual
router.get('/email', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const cfg = await getEmailConfig();
    // Oculta senha parcialmente por segurança
    if (cfg.smtp_pass) cfg.smtp_pass = cfg.smtp_pass.length > 4 ? '••••' + cfg.smtp_pass.slice(-2) : '••••';
    res.json(cfg);
  } catch (err) { next(err); }
});

// POST /api/config/email — salva configurações SMTP
router.post('/email', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email_from, email_from_name } = req.body;
    const configs = { smtp_host, smtp_port, smtp_user, smtp_secure, email_from, email_from_name };
    // Só atualiza senha se não for o placeholder "••••..."
    if (smtp_pass && !smtp_pass.startsWith('••')) configs.smtp_pass = smtp_pass;

    for (const [key, value] of Object.entries(configs)) {
      if (value !== undefined && value !== null) {
        await pool.query(
          `INSERT INTO system_configs (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$3, updated_at=NOW()`,
          [key, String(value), req.user.id]
        );
      }
    }
    res.json({ message: 'Configurações de e-mail salvas com sucesso' });
  } catch (err) { next(err); }
});

// POST /api/config/email/test — envia email de teste
router.post('/email/test', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { to } = req.body;
    const recipient = to || req.user.email;
    if (!recipient) return res.status(400).json({ error: 'Informe o e-mail de destino para o teste' });

    await sendEmail({
      to: recipient,
      subject: '[RelmDesk] Teste de envio de e-mail ✅',
      html: `<h2>Teste de e-mail — RelmDesk</h2>
             <p>Se você recebeu este e-mail, a configuração SMTP está funcionando corretamente!</p>
             <p>Data/hora do teste: <strong>${new Date().toLocaleString('pt-BR')}</strong></p>
             <p>Usuário que solicitou: <strong>${req.user.name}</strong></p>
             <hr/>
             <p style="color:#999;font-size:12px">Este é um e-mail de teste enviado pelo sistema RelmDesk.</p>`,
      text: `Teste de e-mail RelmDesk. Configuração SMTP funcionando! Data: ${new Date().toLocaleString('pt-BR')}`,
    });

    res.json({ message: `E-mail de teste enviado para ${recipient}` });
  } catch (err) {
    res.status(500).json({ error: `Falha no envio: ${err.message}` });
  }
});

module.exports = router;
