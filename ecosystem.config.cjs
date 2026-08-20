/**
 * PM2 process definition for the eplug.mn driver web app.
 *
 *   npm run build && pm2 start ecosystem.config.cjs --env production
 *
 * Serves Next.js on 127.0.0.1:3100; nginx proxies https://eplug.mn/ (the domain
 * root) to it, with the admin console at /admin and the CSMS API at /api.
 * Unlike the CSMS backend this process holds no per-connection state, so it can
 * safely be scaled (`instances: 2`) if the app ever needs it.
 */
module.exports = {
  apps: [
    {
      name: 'eplug-kiosk',
      // Call Next's binary directly: `npm start` would leave an extra shell in
      // the process tree that swallows PM2's stop signals.
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3100 -H 127.0.0.1',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      max_memory_restart: '768M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production', // makes Next load .env.production
        PORT: 3100,
        HOSTNAME: '127.0.0.1',
      },
      out_file: './logs/kiosk.out.log',
      error_file: './logs/kiosk.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
