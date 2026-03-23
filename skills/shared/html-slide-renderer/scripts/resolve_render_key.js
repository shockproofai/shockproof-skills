'use strict';

/**
 * Resolve the RENDER_HTML_API_KEY for calling the renderHtmlToPng cloud function.
 * Priority: process.env.RENDER_HTML_API_KEY → gcloud CLI (if available)
 *
 * In Cowork/sandbox: set RENDER_HTML_API_KEY as an env var.
 * Locally with gcloud: falls back to Secret Manager via gcloud CLI.
 */
async function resolveRenderKey() {
  const SECRET_NAME = 'RENDER_HTML_API_KEY';

  // 1. Environment variable (works everywhere including Cowork)
  if (process.env[SECRET_NAME]) {
    return process.env[SECRET_NAME];
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
      console.log(`  Fetching ${SECRET_NAME} via gcloud CLI (project: ${projectId})...`);
      const key = execSync(
        `gcloud secrets versions access latest --secret=${SECRET_NAME} --project=${projectId} 2>/dev/null`,
        { encoding: 'utf8', timeout: 15000 }
      ).trim();
      if (key) {
        const preview = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : 'TOO_SHORT';
        console.log(`  Fetched ${SECRET_NAME} via gcloud CLI (${preview})`);
        return key;
      }
    }
  } catch {
    // gcloud not available — expected in sandbox environments
  }

  throw new Error(
    `No ${SECRET_NAME} available. Set the ${SECRET_NAME} environment variable.`
  );
}

module.exports = { resolveRenderKey };
