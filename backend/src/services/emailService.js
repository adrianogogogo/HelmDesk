/**
 * Email Service — RelmDesk
 * Estrutura para envio de e-mails via SMTP (Nodemailer).
 * Configuração gerenciada via aba "E-mail" em Configurações.
 */
const nodemailer = require('nodemailer');
const pool = require('../config/database');

// Carrega configuração de email do banco
const getEmailConfig = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM system_configs WHERE key LIKE 'smtp_%' OR key = 'email_from' OR key = 'email_from_name'`
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    return cfg;
  } catch {
    return {};
  }
};

// Cria transporter com configuração atual do banco
const createTransporter = async () => {
  const cfg = await getEmailConfig();
  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
    throw new Error('Configuração SMTP incompleta. Configure em Configurações → E-mail.');
  }
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || '587'),
    secure: cfg.smtp_secure === 'true',
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_pass,
    },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Envia e-mail
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const cfg = await getEmailConfig();
  const transporter = await createTransporter();
  const fromName = cfg.email_from_name || 'RelmDesk';
  const fromAddr = cfg.email_from || cfg.smtp_user;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to,
    subject,
    html,
    text,
  });

  return info;
};

/**
 * Templates de email (prontos para V2)
 */
const templates = {
  ticketCreated: (ticket) => ({
    subject: `[RelmDesk] Ticket #${ticket.ticket_number} aberto — ${ticket.title}`,
    html: `<h2>Seu ticket foi aberto!</h2>
           <p>Número: <strong>#${ticket.ticket_number}</strong></p>
           <p>Assunto: ${ticket.title}</p>
           <p>Status: ${ticket.status_name}</p>
           <p>Acompanhe em: <a href="http://177.153.39.134:3000">RelmDesk</a></p>`,
  }),

  statusUpdated: (ticket, previousStatus) => ({
    subject: `[RelmDesk] Ticket #${ticket.ticket_number} atualizado`,
    html: `<h2>Status do seu ticket foi atualizado</h2>
           <p>Ticket: <strong>#${ticket.ticket_number}</strong></p>
           <p>Status anterior: ${previousStatus}</p>
           <p>Novo status: <strong>${ticket.status_name}</strong></p>`,
  }),

  solutionProposed: (ticket, solution) => ({
    subject: `[RelmDesk] Solução proposta — Ticket #${ticket.ticket_number}`,
    html: `<h2>Uma solução foi proposta para seu ticket</h2>
           <p>Ticket: <strong>#${ticket.ticket_number}</strong></p>
           <p>Solução: ${solution.description}</p>`,
  }),

  ticketResolved: (ticket) => ({
    subject: `[RelmDesk] Ticket #${ticket.ticket_number} resolvido ✅`,
    html: `<h2>Seu ticket foi resolvido!</h2>
           <p>Ticket: <strong>#${ticket.ticket_number}</strong></p>
           <p>Obrigado por entrar em contato. Caso o problema persista, abra um novo ticket.</p>`,
  }),

  taskReminder: (task, assignee) => ({
    subject: `[RelmDesk] Lembrete de tarefa: ${task.title}`,
    html: `<h2>Você tem uma tarefa pendente</h2>
           <p>Olá, ${assignee.name}!</p>
           <p>Tarefa: <strong>${task.title}</strong></p>
           ${task.due_date ? `<p>Prazo: ${new Date(task.due_date).toLocaleDateString('pt-BR')}</p>` : ''}
           <p>Acesse o sistema: <a href="http://177.153.39.134:3000">RelmDesk</a></p>`,
  }),
};

module.exports = { sendEmail, getEmailConfig, createTransporter, templates };
