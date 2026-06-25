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
  console.log('🗑️  Iniciando processo de exclusão de tickets...');
  const ticketToKeep = 'REL-BIKES-000004';
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verificar a existência do ticket a ser mantido
    const { rows: keepCheck } = await client.query(
      'SELECT id, ticket_number, title FROM tickets WHERE ticket_number = $1',
      [ticketToKeep]
    );

    if (keepCheck.length === 0) {
      console.log(`⚠️  Aviso: O ticket "${ticketToKeep}" não foi encontrado no banco de dados local.`);
      console.log('Todos os tickets que forem diferentes deste serão excluídos.');
    } else {
      console.log(`✅ O ticket "${ticketToKeep}" foi encontrado e será MANTIDO: "${keepCheck[0].title}"`);
    }

    // 2. Buscar IDs dos tickets que serão deletados
    const { rows: ticketsToDelete } = await client.query(
      'SELECT id, ticket_number, title FROM tickets WHERE ticket_number != $1',
      [ticketToKeep]
    );

    if (ticketsToDelete.length === 0) {
      console.log('ℹ️  Nenhum ticket encontrado para exclusão.');
      await client.query('COMMIT');
      return;
    }

    console.log(`📋 Serão excluídos ${ticketsToDelete.length} tickets:`);
    ticketsToDelete.forEach(t => console.log(`- [${t.ticket_number}] "${t.title}"`));

    const ticketIds = ticketsToDelete.map(t => t.id);

    // 3. Excluir attachments das tarefas vinculadas aos tickets deletados
    const deleteTasksAttachmentsRes = await client.query(`
      DELETE FROM attachments 
      WHERE task_id IN (
        SELECT id FROM tasks WHERE ticket_id = ANY($1::uuid[])
      )
    `, [ticketIds]);
    console.log(`🧹 Anexos de tarefas excluídos: ${deleteTasksAttachmentsRes.rowCount}`);

    // 4. Excluir tarefas vinculadas aos tickets deletados
    const deleteTasksRes = await client.query(`
      DELETE FROM tasks 
      WHERE ticket_id = ANY($1::uuid[])
    `, [ticketIds]);
    console.log(`🧹 Tarefas excluídas: ${deleteTasksRes.rowCount}`);

    // 5. Excluir os tickets (o cascade cuidará de ticket_products, ticket_history, ticket_blocks, ticket_solutions, attachments de tickets)
    const deleteTicketsRes = await client.query(`
      DELETE FROM tickets 
      WHERE id = ANY($1::uuid[])
    `, [ticketIds]);
    console.log(`🔥 Tickets excluídos do banco de dados: ${deleteTicketsRes.rowCount}`);

    await client.query('COMMIT');
    console.log('🎉 Operação concluída com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a exclusão. Transação revertida:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
