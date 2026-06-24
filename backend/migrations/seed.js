const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'relmdesk',
  user: process.env.DB_USER || 'relmdesk_user',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  console.log('🌱 Seeding database...');
  const client = await pool.connect();

  try {
    // Default admin (Diretor)
    const adminHash = await bcrypt.hash('Admin@2024!', 12);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, department_id, lgpd_consent, lgpd_consent_at)
      VALUES 
        ('Administrador Relm', 'admin@relmbikes.com.br', $1, 'diretor', 1, TRUE, NOW()),
        ('Gestor Bikes', 'gestor@relmbikes.com.br', $1, 'gestor', 1, TRUE, NOW()),
        ('Atendente Demo', 'atendente@relmbikes.com.br', $1, 'atendente', 1, TRUE, NOW())
      ON CONFLICT (email) DO NOTHING
    `, [adminHash]);

    // Sample store
    const storeResult = await client.query(`
      INSERT INTO stores (name, cnpj, email, phone, city, state, department_id)
      VALUES ('Loja Bikes Demo', '00.000.000/0001-00', 'loja@demo.com.br', '11999999999', 'São Paulo', 'SP', 1)
      ON CONFLICT DO NOTHING RETURNING id
    `);

    if (storeResult.rows.length > 0) {
      const storeId = storeResult.rows[0].id;
      const lojaHash = await bcrypt.hash('Loja@2024!', 12);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, department_id, store_id, lgpd_consent, lgpd_consent_at)
        VALUES ('Loja Bikes Demo', 'loja@demo.com.br', $1, 'loja', 1, $2, TRUE, NOW())
        ON CONFLICT (email) DO NOTHING
      `, [lojaHash, storeId]);
    }

    // Sample products
    await client.query(`
      INSERT INTO products (name, description, brand_id, product_type_id, sku)
      VALUES 
        ('Corratec XTB 29 Elite', 'MTB 29 - Alumínio', 1, 1, 'COR-XTB29-EL'),
        ('Goodyear Peak 29x2.3', 'Pneu MTB 29 polegadas', 2, 2, 'GY-PEAK-293'),
        ('Selle Italia X-LR Gel', 'Selim de alto desempenho', 3, 3, 'SI-XLRG-01'),
        ('9th Wave Trail 27.5', 'MTB 27.5 - Carbono', 4, 1, '9W-TRAIL-275')
      ON CONFLICT DO NOTHING
    `);

    // Issue subtypes
    await client.query(`
      INSERT INTO issue_subtypes (issue_type_id, name, sort_order) VALUES
        (1, 'Quadro', 1), (1, 'Componentes', 2), (1, 'Pintura', 3),
        (2, 'Ajuste', 1), (2, 'Reparo', 2), (2, 'Revisão Completa', 3),
        (3, 'Defeito', 1), (3, 'Tamanho Errado', 2), (3, 'Produto Errado', 3)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Seed complete!');
    console.log('');
    console.log('👤 Default users:');
    console.log('   admin@relmbikes.com.br  / Admin@2024!  (Diretor)');
    console.log('   gestor@relmbikes.com.br / Admin@2024!  (Gestor)');
    console.log('   atendente@relmbikes.com.br / Admin@2024!  (Atendente)');
    console.log('   loja@demo.com.br / Loja@2024!  (Loja)');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
