module.exports = {
  apps: [
    {
      name: 'relmdesk-backend',
      cwd: '/home/ubuntu/HelmDesk/backend',
      script: 'src/server.js',
      // As variáveis de ambiente (incluindo SEGREDOS: JWT_SECRET, DB_PASSWORD) são
      // carregadas de backend/.env via dotenv em src/server.js.
      // NÃO declarar segredos aqui — este arquivo é versionado no Git.
      watch: false,
      max_memory_restart: '512M',
      log_file: '/var/log/relmdesk/backend.log',
      error_file: '/var/log/relmdesk/backend-error.log',
      out_file: '/var/log/relmdesk/backend-out.log',
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
