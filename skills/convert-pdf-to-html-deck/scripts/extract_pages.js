'use strict';
const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const os     = require('os');

const RENDERER_ROOT = path.join(__dirname, '../../shared/html-slide-renderer');
const SKILL_ROOT    = path.join(__dirname, '..');
const PDFJS_DIR     = path.join(SKILL_ROOT, 'node_modules', 'pdfjs-dist', 'build');

/**
 * Resolve puppeteer — try local node_modules, then shared renderer's.
 */
function getPuppeteer() {
  try { return require('puppeteer'); } catch { /* fall through */ }
  return require(path.join(RENDERER_ROOT, 'node_modules', 'puppeteer'));
}

/**
 * Start a minimal static HTTP server.
 * Returns { server, port, stop }.
 */
function startServer(serveDir, pdfPath) {
  const mimeMap = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.pdf':  'application/pdf',
    '.png':  'image/png',
  };

  const server = http.createServer((req, res) => {
    let filePath;
    if (req.url === '/pdf') {
      filePath = pdfPath;
    } else {
      filePath = path.join(serveDir, req.url.split('?')[0]);
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end('Not found: ' + req.url); return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeMap[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        stop: () => new Promise(r => server.close(r)),
      });
    });
  });
}

/**
 * Rasterise every page of a PDF to 1280×720 PNG files using PDF.js + Puppeteer.
 * Files are named slide_001.png, slide_002.png, …
 */
async function extractPNGs(pdfPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const puppeteer = getPuppeteer();

  // Write a renderer HTML to a temp dir so we can serve it
  const serveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-render-'));

  // Copy pdfjs build files to temp dir
  fs.cpSync(PDFJS_DIR, path.join(serveDir, 'pdfjs'), { recursive: true });

  // Write the renderer HTML
  const rendererHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; width: 1280px; height: 720px; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="c" width="1280" height="720"></canvas>
<script type="module">
import * as pdfjsLib from '/pdfjs/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';

window._pdfjsLib = pdfjsLib;
window._pdfReady = true;
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(serveDir, 'index.html'), rendererHtml);

  const { port, stop } = await startServer(serveDir, pdfPath);

  console.log(`  Launching Puppeteer (HTTP server on port ${port})...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const pageCount = await getPDFPageCount(pdfPath);
    console.log(`  PDF has ${pageCount} page(s). Rendering each to 1280×720 PNG...`);

    const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
    const pngPaths  = [];
    const W = 1280;
    const H = 720;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const tab = await browser.newPage();
      await tab.setViewport({ width: W, height: H });

      // Navigate to our local renderer page
      await tab.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 15000 });

      // Wait for PDF.js module to initialise
      await tab.waitForFunction(() => window._pdfReady === true, { timeout: 10000 });

      // Render one page
      const result = await tab.evaluate(async (b64, pNum, targetW, targetH) => {
        try {
          const pdfjsLib = window._pdfjsLib;
          const pdfData  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const doc      = await pdfjsLib.getDocument({ data: pdfData, useSystemFonts: true }).promise;
          const pdfPage  = await doc.getPage(pNum);

          const vp0      = pdfPage.getViewport({ scale: 1 });
          const scale    = Math.min(targetW / vp0.width, targetH / vp0.height);
          const viewport = pdfPage.getViewport({ scale });

          const canvas   = document.getElementById('c');
          canvas.width   = targetW;
          canvas.height  = targetH;
          const ctx      = canvas.getContext('2d');
          ctx.fillStyle  = 'white';
          ctx.fillRect(0, 0, targetW, targetH);

          const offsetX  = Math.floor((targetW - viewport.width)  / 2);
          const offsetY  = Math.floor((targetH - viewport.height) / 2);

          await pdfPage.render({
            canvasContext: ctx,
            viewport,
            transform: [1, 0, 0, 1, offsetX, offsetY],
          }).promise;

          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }, pdfBase64, pageNum, W, H);

      if (!result.ok) {
        console.warn(`  Warning: page ${pageNum} render issue: ${result.error}`);
      }

      const dest = path.join(outputDir, `slide_${String(pageNum).padStart(3, '0')}.png`);
      await tab.screenshot({
        path: dest,
        type: 'png',
        clip: { x: 0, y: 0, width: W, height: H },
      });
      await tab.close();
      pngPaths.push(dest);
      process.stdout.write(`  Rendered page ${pageNum}/${pageCount}\r`);
    }

    console.log(`\n  Extracted ${pngPaths.length} slide PNGs`);
    return pngPaths;

  } finally {
    await browser.close();
    await stop();
    // Clean up temp dir
    try { fs.rmSync(serveDir, { recursive: true, force: true }); } catch {}
  }
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
