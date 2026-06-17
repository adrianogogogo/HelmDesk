const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stores WHERE is_active=TRUE ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/stores — cria loja + usuário de acesso automaticamente
router.post('/', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, cnpj, email, phone, address, city, state, password } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome da loja é obrigatório' });
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório para criar acesso' });

    // Criar loja
    const { rows: storeRows } = await client.query(
      `INSERT INTO stores (name,cnpj,email,phone,address,city,state) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, cnpj || null, email, phone || null, address || null, city || null, state || null]
    );
    const store = storeRows[0];

    // Verificar se já existe usuário com esse e-mail
    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    let userCreated = false;
    let loginPassword = null;

    if (!existing.length) {
      // Senha: informada ou padrão Loja@{ano}!
      const year = new Date().getFullYear();
      loginPassword = password || `Loja@${year}!`;
      const hash = await bcrypt.hash(loginPassword, 10);

      await client.query(`
        INSERT INTO users (name, email, password_hash, role, store_id, department_id, is_active)
        VALUES ($1, $2, $3, 'loja', $4, 1, TRUE)
      `, [name, email, hash, store.id]);

      userCreated = true;
    } else {
      // Usuário já existe — atualizar store_id se necessário
      await client.query('UPDATE users SET store_id = $1 WHERE email = $2', [store.id, email]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...store,
      user_created: userCreated,
      login_email: email,
      login_password: userCreated ? loginPassword : '(usuário já existia)',
      message: userCreated
        ? `Loja criada! Login: ${email} / Senha: ${loginPassword}`
        : 'Loja criada! Usuário existente vinculado.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.patch('/:id', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, cnpj, email, phone, address, city, state, is_active, password } = req.body;

    await client.query(
      `UPDATE stores SET name=COALESCE($1,name),cnpj=COALESCE($2,cnpj),email=COALESCE($3,email),
       phone=COALESCE($4,phone),address=COALESCE($5,address),city=COALESCE($6,city),
       state=COALESCE($7,state),is_active=COALESCE($8,is_active),updated_at=NOW() WHERE id=$9`,
      [name, cnpj, email, phone, address, city, state, is_active, id]
    );

    // Buscar se existe usuário correspondente (role = 'loja' e store_id = id)
    const { rows: userRows } = await client.query(
      "SELECT id FROM users WHERE store_id = $1 AND role = 'loja' LIMIT 1",
      [id]
    );

    if (userRows.length > 0) {
      const userId = userRows[0].id;
      let passwordQuery = '';
      let queryParams = [name, email, is_active, userId];
      let paramCount = 5;

      if (password) {
        const hash = await bcrypt.hash(password, 10);
        passwordQuery = `, password_hash = $${paramCount}`;
        queryParams.push(hash);
        paramCount++;
      }

      await client.query(`
        UPDATE users SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
          ${passwordQuery}
        WHERE id = $4
      `, queryParams);
    } else if (email && password) {
      // Se não existia usuário mas o e-mail e a senha foram enviados, cria um
      const hash = await bcrypt.hash(password, 10);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, store_id, department_id, is_active)
        VALUES ($1, $2, $3, 'loja', $4, 1, TRUE)
      `, [name || 'Acesso Loja', email, hash, id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Loja e usuário de acesso atualizados com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
