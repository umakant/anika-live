module.exports = {
  apps: [
    {
      name: "anika-live-studio",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/apps/anika-live",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        LIVE_DATA_ROOT: "/var/www/apps/anika-live/live-data",
      },
    },
  ],
};
