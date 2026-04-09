module.exports = {
  apps: [
    {
      name: "unfair-board-server",
      cwd: "./apps/server",
      script: "dist/main.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        CORS_ORIGIN: "https://your-frontend-domain.com"
      }
    }
  ]
};
