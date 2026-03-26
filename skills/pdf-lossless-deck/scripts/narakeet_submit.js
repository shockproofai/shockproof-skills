'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Submit a completed narakeet.zip to the Narakeet API and download the video.
 *
 * Requires NARAKEET_API_KEY in the environment (or gcloud CLI fallback).
 *
 * @param {string} outputDir      Directory containing narakeet.zip
 * @param {object} [opts]
 * @param {string} [opts.videoFilename]  Output filename for the .mp4 (default: output.mp4)
 * @returns {Promise<string>}     Absolute path to the downloaded video file
 */
async function submitToNarakeet(outputDir, opts = {}) {
  const NARAKEET_BASE = 'https://api.narakeet.com';
  const SCRIPT_NAME   = 'narakeet-script.md';
  const zipPath = path.join(outputDir, 'narakeet.zip');

  if (!fs.existsSync(zipPath)) {
    throw new Error('narakeet.zip not found in output directory');
  }

  // ── 1. Resolve API key ──────────────────────────────────────────────────────
  let apiKey = process.env.NARAKEET_API_KEY;
  if (!apiKey) {
    try {
      const { execSync } = require('child_process');
      const projectId =
        process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT ||
        execSync('gcloud config get-value project 2>/dev/null', { encoding: 'utf8' }).trim();
      if (projectId) {
        console.log(`  Fetching NARAKEET_API_KEY via gcloud CLI (project: ${projectId})...`);
        apiKey = execSync(
          `gcloud secrets versions access latest --secret=NARAKEET_API_KEY --project=${projectId} 2>/dev/null`,
          { encoding: 'utf8', timeout: 15000 }
        ).trim();
        if (apiKey) {
          const preview = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'TOO_SHORT';
          console.log(`  Fetched NARAKEET_API_KEY via gcloud CLI (${preview})`);
        }
      }
    } catch {
      // gcloud not available
    }
  }
  if (!apiKey) {
    throw new Error('No NARAKEET_API_KEY available. Set the NARAKEET_API_KEY environment variable.');
  }

  // ── 2. Load axios ───────────────────────────────────────────────────────────
  const SKILL_ROOT = path.join(__dirname, '..');
  let axios;
  try { axios = require('axios'); } catch {
    try { axios = require(path.join(SKILL_ROOT, 'node_modules', 'axios')); } catch {
      throw new Error('axios not installed — run: npm install in the plugin directory');
    }
  }

  const headers = { 'x-api-key': apiKey };

  // ── 3. Request upload token ─────────────────────────────────────────────────
  console.log('  Requesting Narakeet upload token...');
  const tokenRes = await axios.get(`${NARAKEET_BASE}/video/upload-request/zip`, {
    headers, timeout: 30000,
  });
  const { url: uploadUrl, contentType, repositoryType, repository } = tokenRes.data;

  // ── 4. Upload ZIP ───────────────────────────────────────────────────────────
  const zipSize = fs.statSync(zipPath).size;
  console.log(`  Uploading narakeet.zip (${(zipSize / 1024 / 1024).toFixed(1)} MB)...`);
  const zipStream = fs.createReadStream(zipPath);
  await axios.put(uploadUrl, zipStream, {
    headers: { 'Content-Type': contentType, 'Content-Length': zipSize },
    maxBodyLength: 512 * 1024 * 1024,
    timeout: 300000,
  });
  console.log('  Upload complete.');

  // ── 5. Request build ────────────────────────────────────────────────────────
  console.log('  Requesting Narakeet build...');
  const buildRes = await axios.post(`${NARAKEET_BASE}/video/build`, {
    repositoryType, repository, source: SCRIPT_NAME,
  }, {
    headers: { ...headers, 'Content-Type': 'application/json' },
    timeout: 60000,
  });
  const { statusUrl } = buildRes.data;
  console.log(`  Build started. Polling: ${statusUrl}`);

  // ── 6. Poll for completion ──────────────────────────────────────────────────
  const pollInterval = 10000; // 10s
  const maxPolls = 60; // 10 min max
  let pollCount = 0;
  let result;

  while (true) {
    const statusRes = await axios.get(statusUrl, { timeout: 30000 });
    result = statusRes.data;

    if (result.finished) break;

    pollCount++;
    if (pollCount >= maxPolls) {
      throw new Error(`Narakeet polling timeout after ${pollCount} attempts`);
    }
    const pct = result.percent ? ` (${result.percent}%)` : '';
    process.stdout.write(`\r  Building video... poll ${pollCount}/${maxPolls}${pct}`);
    await new Promise(r => setTimeout(r, pollInterval));
  }
  console.log('');

  if (result.succeeded === false) {
    throw new Error(`Narakeet build failed: ${result.message || 'unknown error'}`);
  }
  if (!result.result) {
    throw new Error('Narakeet build finished but no download URL returned');
  }
  console.log('  Build complete!');

  // ── 7. Download video ───────────────────────────────────────────────────────
  const videoFilename = opts.videoFilename || 'output.mp4';
  const videoPath = path.join(outputDir, videoFilename);
  console.log(`  Downloading video to ${videoFilename}...`);

  const videoRes = await axios.get(result.result, {
    responseType: 'stream', timeout: 300000, maxContentLength: 400 * 1024 * 1024,
  });
  const writer = fs.createWriteStream(videoPath);
  videoRes.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    videoRes.data.on('error', reject);
  });

  const videoSize = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1);
  console.log(`✓ Narakeet video saved: ${videoPath}  (${videoSize} MB)`);
  return videoPath;
}

module.exports = { submitToNarakeet };
