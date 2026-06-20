const fs = require("fs");
const path = require("path");

const appDir = "/var/www/apps/anika-live";

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const fileEnv = loadEnvFile(path.join(appDir, ".env"));

module.exports = {
  apps: [
    {
      name: "anika-live-studio",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      cwd: appDir,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        ...fileEnv,
        PORT: fileEnv.PORT || "3010",
        HOSTNAME: fileEnv.HOSTNAME || "0.0.0.0",
        LIVE_DATA_ROOT:
          fileEnv.LIVE_DATA_ROOT || "/var/www/apps/anika-live/live-data",
      },
    },
  ],
};
