module.exports = {
  apps: [
    {
      name: "mer2-backend",
      cwd: "/var/www/mer2/backend",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mer2-parser",
      cwd: "/var/www/mer2/services/parser",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mer2-embedder",
      cwd: "/var/www/mer2/services/embedder",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mer2-skill-extractor",
      cwd: "/var/www/mer2/services/skill-extractor",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mer2-matcher",
      cwd: "/var/www/mer2/services/matcher",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mer2-feedback",
      cwd: "/var/www/mer2/services/feedback",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    }
  ]
};
