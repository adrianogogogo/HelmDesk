const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const fs = require('fs');

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
    res.json({ message: 'Produto updated' });
  } catch (err) { next(err); }
});

// Função robusta de parseamento de CSV
function parseCSV(text) {
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const result = [];
  let row = [''];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push('');
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (row.length > 1 || row[0] !== '') {
        result.push(row);
      }
      row = [''];
      i++;
      continue;
    }

    row[row.length - 1] += char;
    i++;
  }

  if (row.length > 1 || row[0] !== '') {
    result.push(row);
  }

  return { delimiter, rows: result };
}

// Rota de importação de CSV
router.post('/import-csv', authenticate, authorize('gestor', 'diretor'), upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const { department_id } = req.body;
  const deptId = parseInt(department_id) || 1;

  const client = await pool.connect();
  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const parsed = parseCSV(fileContent);

    if (parsed.rows.length <= 1) {
      throw new Error('O arquivo CSV está vazio ou contém apenas cabeçalhos.');
    }

    // Normaliza os cabeçalhos para mapear os índices
    const headers = parsed.rows[0].map(h => 
      h.trim()
       .toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
    );

    const colIndices = {
      name: headers.findIndex(h => h === 'nome'),
      description: headers.findIndex(h => h === 'descricao' || h === 'descricao do produto'),
      brand: headers.findIndex(h => h === 'marca'),
      type: headers.findIndex(h => h === 'tipo' || h === 'tipo de produto' || h === 'tipo_produto'),
      sku: headers.findIndex(h => h === 'sku'),
      model: headers.findIndex(h => h === 'modelo'),
      year: headers.findIndex(h => h === 'ano'),
      system_id: headers.findIndex(h => h === 'system id' || h === 'systemid' || h === 'system_id'),
      korp_id: headers.findIndex(h => h === 'korp id' || h === 'korpid' || h === 'korp_id')
    };

    if (colIndices.name === -1) {
      throw new Error('A coluna "Nome" é obrigatória e não foi encontrada no arquivo CSV.');
    }

    await client.query('BEGIN');
    let created = 0;
    let updated = 0;

    const brandCache = {};
    const typeCache = {};

    for (let idx = 1; idx < parsed.rows.length; idx++) {
      const row = parsed.rows[idx];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const getValue = (colName) => {
        const colIdx = colIndices[colName];
        return colIdx !== -1 && row[colIdx] ? row[colIdx].trim() : null;
      };

      const name = getValue('name');
      if (!name) continue; // Nome é obrigatório

      const description = getValue('description');
      const brandName = getValue('brand');
      const typeName = getValue('type');
      const sku = getValue('sku');
      const model = getValue('model');
      const yearStr = getValue('year');
      const year = yearStr ? parseInt(yearStr) || null : null;
      const system_id = getValue('system_id');
      const korp_id = getValue('korp_id');

      // 1. Resolver Marca
      let brandId = null;
      if (brandName) {
        const brandKey = brandName.toLowerCase();
        if (brandCache[brandKey]) {
          brandId = brandCache[brandKey];
        } else {
          const { rows: brandRows } = await client.query(
            'SELECT id FROM brands WHERE LOWER(name) = $1',
            [brandKey]
          );
          if (brandRows.length > 0) {
            brandId = brandRows[0].id;
          } else {
            const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const { rows: newBrandRows } = await client.query(
              'INSERT INTO brands (name, slug, department_id) VALUES ($1, $2, $3) RETURNING id',
              [brandName, slug, deptId]
            );
            brandId = newBrandRows[0].id;
          }
          brandCache[brandKey] = brandId;
        }
      }

      // 2. Resolver Tipo
      let typeId = null;
      if (typeName) {
        const typeKey = typeName.toLowerCase();
        if (typeCache[typeKey]) {
          typeId = typeCache[typeKey];
        } else {
          const { rows: typeRows } = await client.query(
            'SELECT id FROM product_types WHERE LOWER(name) = $1',
            [typeKey]
          );
          if (typeRows.length > 0) {
            typeId = typeRows[0].id;
          } else {
            const { rows: newTypeRows } = await client.query(
              'INSERT INTO product_types (name, department_id) VALUES ($1, $2) RETURNING id',
              [typeName, deptId]
            );
            typeId = newTypeRows[0].id;
          }
          typeCache[typeKey] = typeId;
        }
      }

      // 3. Upsert baseado em SKU
      let productExists = false;
      let existingProductId = null;

      if (sku) {
        const { rows: existingProducts } = await client.query(
          'SELECT id FROM products WHERE sku = $1',
          [sku]
        );
        if (existingProducts.length > 0) {
          productExists = true;
          existingProductId = existingProducts[0].id;
        }
      }

      if (productExists) {
        await client.query(`
          UPDATE products 
          SET name = $1, description = $2, brand_id = $3, product_type_id = $4, 
              model = $5, year = $6, system_id = $7, korp_id = $8, department_id = $9, 
              updated_at = NOW() 
          WHERE id = $10
        `, [name, description, brandId, typeId, model, year, system_id, korp_id, deptId, existingProductId]);
        updated++;
      } else {
        await client.query(`
          INSERT INTO products (name, description, brand_id, product_type_id, sku, model, year, system_id, korp_id, department_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [name, description, brandId, typeId, sku, model, year, system_id, korp_id, deptId]);
        created++;
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, created, updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Erro ao processar arquivo CSV.' });
  } finally {
    client.release();
    fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
