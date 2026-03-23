'use strict';

/**
 * Resolve a named API key.
 * Priority: process.env[envVarName] → Claude Code OAuth token → gcloud CLI
 *
 * In Cowork/sandbox: set keys as env vars (no gcloud or Secret Manager needed).
 *
 * @param {string} secretName   Name in Secret Manager (e.g. "ANTHROPIC_API_KEY")
 * @param {string} [envVarName] Env var to check first (defaults to secretName)
 */
async function resolveApiKey(secretName, envVarName) {
  const envKey = envVarName || secretName;

  // 1. Environment variable (works everywhere including Cowork)
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // 1b. For ANTHROPIC_API_KEY: fall back to the Claude Code OAuth token if present
  if (secretName === 'ANTHROPIC_API_KEY' && process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }

  // 2. gcloud CLI fallback (local dev only)
  try {
    const { execSync } = require('child_process');
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      execSync('gcloud config get-value project 2>/dev/null', { encoding: 'utf8' }).trim();

    if (projectId) {
      console.log(`  Fetching ${secretName} via gcloud CLI (project: ${projectId})...`);
      const key = execSync(
        `gcloud secrets versions access latest --secret=${secretName} --project=${projectId} 2>/dev/null`,
        { encoding: 'utf8', timeout: 15000 }
      ).trim();
      if (key) {
        const preview = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : 'TOO_SHORT';
        console.log(`  Fetched ${secretName} via gcloud CLI (${preview})`);
        return key;
      }
    }
  } catch {
    // gcloud not available — expected in sandbox environments
  }

  throw new Error(
    `No ${envKey} available. Set the ${envKey} environment variable.`
  );
}

module.exports = { resolveApiKey };
