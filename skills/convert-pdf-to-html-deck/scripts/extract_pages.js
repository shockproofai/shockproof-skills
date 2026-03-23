'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');
const SKILL_ROOT    = path.join(__dirname, '..');

// ── Google access token minting from service account key ────────────────────

/**
 * Mint a short-lived Google access token from a service account JSON key.
 * Uses the OAuth2 JWT bearer flow — no SDK or gcloud CLI needed.
 */
async function mintAccessTokenFromServiceAccount(keyJson) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: keyJson.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(keyJson.private_key, 'base64url');

  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to mint access token: ${tokenRes.status} ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

/**
 * Resolve a Google access token for Storage REST API.
 * Priority: GCS_SERVICE_ACCOUNT_KEY env var (base64 JSON) → gcloud CLI fallback.
 */
async function resolveAccessToken() {
  // 1. Service account key (base64-encoded JSON) — works in Cowork/sandbox
  if (process.env.GCS_SERVICE_ACCOUNT_KEY) {
    const keyJson = JSON.parse(
      Buffer.from(process.env.GCS_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
    );
    return mintAccessTokenFromServiceAccount(keyJson);
  }

  // 2. gcloud CLI fallback (local dev only)
  try {
    const { execSync } = require('child_process');
    return execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    throw new Error(
      'No GCS credentials available. Set GCS_SERVICE_ACCOUNT_KEY env var ' +
      '(base64-encoded service account JSON), or install gcloud CLI.'
    );
  }
}

/**
 * Upload a file to Firebase Storage via the JSON API (no gcloud CLI required).
 */
async function uploadToStorage(localPath, storagePath, bucket) {
  const accessToken = await resolveAccessToken();
  const fileBuffer = fs.readFileSync(localPath);
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
      'Content-Length': String(fileBuffer.length),
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Storage upload failed (${response.status}): ${errorText}`);
  }
}

/**
 * Rasterise every page of a PDF to 1280x720 PNG files via the renderHtmlToPng
 * cloud function. The PDF is uploaded to Firebase Storage via REST API, then the
 * cloud function renders each page using PDF.js and returns base64 PNGs.
 * Files are named slide_001.png, slide_002.png, ...
 */
async function extractPNGs(pdfPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const { resolveRenderKey } = require(path.join(RENDERER_ROOT, 'scripts', 'resolve_render_key'));

  // Upload PDF to Firebase Storage temp path via REST API
  const pdfFilename = `tmp/render-pdf-${Date.now()}-${path.basename(pdfPath)}`;
  const bucket = 'shockproof-dev.firebasestorage.app';

  console.log(`  Uploading PDF to Storage: ${pdfFilename}...`);
  await uploadToStorage(pdfPath, pdfFilename, bucket);

  // Call cloud function with Storage path
  const apiKey = await resolveRenderKey();
  const cloudUrl = process.env.RENDER_HTML_URL ||
    'https://us-central1-shockproof-dev.cloudfunctions.net/renderHtmlToPng';

  console.log(`  Rendering PDF pages via cloud function...`);
  const response = await fetch(cloudUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ pdfStoragePath: pdfFilename, width: 1280, height: 720 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud PDF render failed (${response.status}): ${errorText}`);
  }

  const { pngs, pageCount } = await response.json();
  console.log(`  PDF has ${pageCount} page(s).`);

  // Write PNGs to disk
  const pngPaths = [];
  for (let i = 0; i < pngs.length; i++) {
    const dest = path.join(outputDir, `slide_${String(i + 1).padStart(3, '0')}.png`);
    fs.writeFileSync(dest, Buffer.from(pngs[i], 'base64'));
    pngPaths.push(dest);
    console.log(`  Rendered page ${i + 1}/${pageCount}`);
  }

  console.log(`  Extracted ${pngPaths.length} slide PNGs`);
  return pngPaths;
}

/**
 * Get page count from a PDF using pdf-parse (lightweight).
 */
async function getPDFPageCount(pdfPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    pdfParse = require(path.join(SKILL_ROOT, 'node_modules', 'pdf-parse'));
  }
  const buf = fs.readFileSync(pdfPath);
  const result = await pdfParse(buf);
  return result.numpages || 1;
}

/**
 * Extract text content per page from a PDF using pdf-parse.
 * Returns an array of strings (one per page).
 */
async function extractPageText(pdfPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    pdfParse = require(path.join(SKILL_ROOT, 'node_modules', 'pdf-parse'));
  }

  const buf   = fs.readFileSync(pdfPath);
  const pages = [];

  const opts = {
    pagerender(pageData) {
      return pageData.getTextContent().then(tc => {
        const text = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
        pages.push(text);
        return text;
      });
    },
  };

  await pdfParse(buf, opts);

  // Fall back: split on form-feed
  if (pages.length === 0) {
    const result = await pdfParse(buf);
    const fullText = result.text || '';
    fullText.split(/\f/).forEach(p => pages.push(p.trim()));
  }

  return pages;
}

module.exports = { extractPNGs, extractPageText };
