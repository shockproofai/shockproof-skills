'use strict';
const { execSync } = require('child_process');
const path = require('path');

/**
 * Resolve a named API key.
 * Priority: process.env[envVarName] → gcloud CLI → @google-cloud/secret-manager
 * @param {string} secretName   Name in Secret Manager (e.g. "ANTHROPIC_API_KEY")
 * @param {string} [envVarName] Env var to check first (defaults to secretName)
 */
async function resolveApiKey(secretName, envVarName) {
  const envKey = envVarName || secretName;

  // 1. Environment variable
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // 1b. For ANTHROPIC_API_KEY: fall back to the Claude Code OAuth token if present
  if (secretName === 'ANTHROPIC_API_KEY' && process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }

  // 2. gcloud CLI — preferred over Node client (avoids RAPT token staleness)
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (() => {
      try { return execSync('gcloud config get-value project 2>/dev/null', { encoding: 'utf8' }).trim(); }
      catch { return null; }
    })();

  if (projectId) {
    try {
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
    } catch {
      console.log(`  gcloud CLI failed for ${secretName}, trying Secret Manager client...`);
    }
  }

  // 3. @google-cloud/secret-manager Node.js client
  if (!projectId) {
    throw new Error(
      `No ${envKey} env var and no GCP project found. ` +
      `Set ${envKey}, run gcloud init, or set GCLOUD_PROJECT.`
    );
  }
  let SecretManagerServiceClient;
  try {
    SecretManagerServiceClient = require('@google-cloud/secret-manager').SecretManagerServiceClient;
  } catch {
    const sharedNM = path.join(__dirname, '../../shared/html-slide-renderer/node_modules/@google-cloud/secret-manager');
    SecretManagerServiceClient = require(sharedNM).SecretManagerServiceClient;
  }
  const client = new SecretManagerServiceClient();
  const [res] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
  });
  if (!res.payload?.data) throw new Error(`Secret ${secretName} has no payload`);
  const key = res.payload.data.toString().trim();
  const preview = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : 'TOO_SHORT';
  console.log(`  Fetched ${secretName} via Secret Manager client (${preview})`);
  return key;
}

module.exports = { resolveApiKey };
