const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { department_id = 1, search, brand_id } = req.query;
    let whereClause = 'WHERE p.department_id = $1';
    const params = [department_id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.model ILIKE $${params.length})`;
    }
    if (brand_id) {
      params.push(brand_id);
      whereClause += ` AND p.brand_id = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT p.*, b.name as brand_name, pt.name as type_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_types pt ON pt.id = p.product_type_id
      ${whereClause}
      ORDER BY p.name ASC
    `, params);
    // Return both formats for compatibility
    res.json({ products: rows, total: rows.length, data: rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { name, description, brand_id, product_type_id, sku, model, year, system_id, korp_id, department_id } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO products (name, description, brand_id, product_type_id, sku, model, year, system_id, korp_id, department_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [name, description, brand_id || null, product_type_id || null, sku, model, year || null, system_id, korp_id, department_id || 1]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('gestor', 'diretor'), async (req, res, next) => {
  try {
    const { name, description, brand_id, product_type_id, sku, model, year, system_id, korp_id, is_active } = req.body;
    await pool.query(`
      UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description),
        brand_id=COALESCE($3,brand_id), product_type_id=COALESCE($4,product_type_id),
        sku=COALESCE($5,sku), model=COALESCE($6,model), year=COALESCE($7,year),
        system_id=COALESCE($8,system_id), korp_id=COALESCE($9,korp_id),
        is_active=COALESCE($10,is_active), updated_at=NOW() WHERE id=$11
    `, [name, description, brand_id || null, product_type_id || null, sku, model, year || null, system_id, korp_id, is_active, req.params.id]);
    res.json({ message: 'Produto atualizado' });
  } catch (err) { next(err); }
});

module.exports = router;
