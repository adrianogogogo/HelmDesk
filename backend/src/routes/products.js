const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { department_id = 1 } = req.query;
    const { rows } = await pool.query(`
      SELECT p.*, b.name as brand_name, pt.name as type_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_types pt ON pt.id = p.product_type_id
      WHERE p.department_id = $1 AND p.is_active = TRUE
      ORDER BY p.name ASC
    `, [department_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { name, description, brand_id, product_type_id, sku, system_id, korp_id, department_id } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO products (name, description, brand_id, product_type_id, sku, system_id, korp_id, department_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [name, description, brand_id, product_type_id, sku, system_id, korp_id, department_id || 1]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { name, description, brand_id, product_type_id, sku, system_id, korp_id, is_active } = req.body;
    await pool.query(`
      UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description),
        brand_id=COALESCE($3,brand_id), product_type_id=COALESCE($4,product_type_id),
        sku=COALESCE($5,sku), system_id=COALESCE($6,system_id), korp_id=COALESCE($7,korp_id),
        is_active=COALESCE($8,is_active), updated_at=NOW() WHERE id=$9
    `, [name, description, brand_id, product_type_id, sku, system_id, korp_id, is_active, req.params.id]);
    res.json({ message: 'Product updated' });
  } catch (err) { next(err); }
});

module.exports = router;
