const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'relmdesk',
  user: process.env.DB_USER || 'relmdesk_user',
  password: process.env.DB_PASSWORD,
});

async function main() {
  console.log('🔍 Consultando tickets no banco de dados...');
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, ticket_number, title, created_at FROM tickets ORDER BY ticket_number'
    );
    console.log(`📊 Total de tickets encontrados: ${rows.length}`);
    rows.forEach(ticket => {
      console.log(`- [${ticket.ticket_number}] "${ticket.title}" (Criado em: ${ticket.created_at})`);
    });
  } catch (err) {
    console.error('❌ Erro ao consultar banco:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
