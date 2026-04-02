module.exports = {
  apps: [
    {
      name: 'relmdesk-backend',
      cwd: '/home/ubuntu/HelmDesk/backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
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
