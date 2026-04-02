const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stores WHERE is_active=TRUE ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name, cnpj, email, phone, address, city, state } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO stores (name,cnpj,email,phone,address,city,state) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name,cnpj,email,phone,address,city,state]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('gestor','diretor'), async (req, res, next) => {
  try {
    const { name,cnpj,email,phone,address,city,state,is_active } = req.body;
    await pool.query(
      `UPDATE stores SET name=COALESCE($1,name),cnpj=COALESCE($2,cnpj),email=COALESCE($3,email),
       phone=COALESCE($4,phone),address=COALESCE($5,address),city=COALESCE($6,city),
       state=COALESCE($7,state),is_active=COALESCE($8,is_active),updated_at=NOW() WHERE id=$9`,
      [name,cnpj,email,phone,address,city,state,is_active,req.params.id]
    );
    res.json({ message: 'Loja atualizada' });
  } catch (err) { next(err); }
});

module.exports = router;
