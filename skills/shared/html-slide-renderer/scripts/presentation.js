'use strict';
const fs   = require('fs');
const path = require('path');

module.exports = function makePresentation(ctx) {
  const { W, H, Slide } = ctx;

  function createPresentation() {
    const slides = [];
    const pres = {
      slides,
      addSlide(bgColor) {
        const s = new Slide(bgColor);
        slides.push(s);
        return s;
      },

      async toPNGs(outputDir) {
        const { resolveRenderKey } = require('./resolve_render_key');

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // Collect all slide HTML strings
        const htmlStrings = slides.map(s => s.htmlString());

        // Resolve API key and call cloud function
        const apiKey = await resolveRenderKey();
        const cloudUrl = process.env.RENDER_HTML_URL ||
          'https://us-central1-shockproof-dev.cloudfunctions.net/renderHtmlToPng';

        console.log(`  Rendering ${slides.length} slides via cloud function...`);
        const response = await fetch(cloudUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({ slides: htmlStrings, width: W, height: H }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cloud render failed (${response.status}): ${errorText}`);
        }

        const { pngs } = await response.json();

        // Write PNGs to disk
        const paths = [];
        for (let i = 0; i < pngs.length; i++) {
          const outPath = path.join(outputDir, `slide_${String(i + 1).padStart(3, '0')}.png`);
          fs.writeFileSync(outPath, Buffer.from(pngs[i], 'base64'));
          console.log(`  Rendered slide ${i + 1}/${slides.length} → ${path.basename(outPath)}`);
          paths.push(outPath);
        }
        console.log(`✓ ${slides.length} PNGs saved to: ${outputDir}`);

        // Auto-write slide-narration.json, narakeet-script.md, and narakeet.zip if any slide has narration
        this.writeNarration(outputDir);
        this.writeNarakeetScript(outputDir);
        await this.writeNarakeetZip(outputDir);

        return paths;
      },

      // Write slide-narration.json from per-slide narrate() calls
      writeNarration(outputDir) {
        const narration = {};
        let hasAny = false;
        for (let i = 0; i < slides.length; i++) {
          if (slides[i]._narration) {
            narration[String(i + 1)] = slides[i]._narration;
            hasAny = true;
          }
        }
        if (!hasAny) return null;
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const jsonPath = path.join(outputDir, 'slide-narration.json');
        fs.writeFileSync(jsonPath, JSON.stringify(narration, null, 2));
        const count = Object.keys(narration).length;
        const missing = slides.length - count;
        console.log(`✓ Narration saved: ${jsonPath}  (${count}/${slides.length} slides${missing ? `, ${missing} missing` : ''})`);
        return jsonPath;
      },

      // Write narakeet-script.md — Narakeet video generation script
      writeNarakeetScript(outputDir, opts = {}) {
        const voice      = opts.voice      || 'hannah';
        const size       = opts.size       || '1080p';
        const transition = opts.transition || 'crossfade 0.25';

        // Only generate if at least one slide has narration
        let hasAny = false;
        for (let i = 0; i < slides.length; i++) {
          if (slides[i]._narration) { hasAny = true; break; }
        }
        if (!hasAny) return null;

        // YAML front-matter
        const lines = [
          '---',
          `size: ${size}`,
          `voice: ${voice}`,
          `transition: ${transition}`,
          'subtitles:',
          '  mode: embed',
          'canvas: white',
          '---',
        ];

        // One scene per slide
        for (let i = 0; i < slides.length; i++) {
          const num = String(i + 1).padStart(3, '0');
          const narration = slides[i]._narration || 'No narration provided.';

          lines.push('');
          lines.push(`(image: slide_${num}.png)`);
          lines.push('');
          lines.push(narration);
          lines.push('');
          lines.push('---');
        }

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const scriptPath = path.join(outputDir, 'narakeet-script.md');
        fs.writeFileSync(scriptPath, lines.join('\n'));
        console.log(`✓ Narakeet script saved: ${scriptPath}  (${slides.length} scenes)`);
        return scriptPath;
      },

      // Write narakeet.zip — script + all PNGs in one archive for Narakeet upload
      async writeNarakeetZip(outputDir) {
        // Only generate if narakeet-script.md exists
        const scriptPath = path.join(outputDir, 'narakeet-script.md');
        if (!fs.existsSync(scriptPath)) return null;

        let archiver;
        const skillNM = path.join(__dirname, '..', 'node_modules');
        try {
          archiver = require('archiver');
        } catch (e) {
          try {
            archiver = require(path.join(skillNM, 'archiver'));
          } catch (e2) {
            console.log('⚠ archiver not installed — skipping narakeet.zip');
            return null;
          }
        }

        const zipPath = path.join(outputDir, 'narakeet.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        const done = new Promise((resolve, reject) => {
          output.on('close', resolve);
          archive.on('error', reject);
        });

        archive.pipe(output);

        // Add the Narakeet script
        archive.file(scriptPath, { name: 'narakeet-script.md' });

        // Add all slide PNGs
        for (let i = 0; i < slides.length; i++) {
          const pngName = `slide_${String(i + 1).padStart(3, '0')}.png`;
          const pngPath = path.join(outputDir, pngName);
          if (fs.existsSync(pngPath)) {
            archive.file(pngPath, { name: pngName });
          }
        }

        await archive.finalize();
        await done;

        const sizeMB = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
        console.log(`✓ Narakeet ZIP saved: ${zipPath}  (${slides.length} PNGs + script, ${sizeMB} MB)`);
        return zipPath;
      },

      async toPDF(outputPath, pngPaths) {
        let PDFDocument;
        const skillNM = path.join(__dirname, '..', 'node_modules');
        try {
          PDFDocument = require('pdf-lib').PDFDocument;
        } catch (e) {
          try {
            PDFDocument = require(path.join(skillNM, 'pdf-lib')).PDFDocument;
          } catch (e2) {
            const np = '/usr/local/lib/node_modules_global/lib/node_modules';
            PDFDocument = require(path.join(np, 'pdf-lib')).PDFDocument;
          }
        }
        const pdfDoc = await PDFDocument.create();
        const PAGE_W = W * 0.75, PAGE_H = H * 0.75;
        const sourcePaths = pngPaths || slides.map((_, i) =>
          path.join(path.dirname(outputPath), `slide_${String(i + 1).padStart(3, '0')}.png`)
        );
        for (const pngPath of sourcePaths) {
          const pngBuf = fs.readFileSync(pngPath);
          const pngImg = await pdfDoc.embedPng(pngBuf);
          const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          page.drawImage(pngImg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
        }
        const bytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, bytes);
        console.log(`✓ PDF saved: ${outputPath}  (${sourcePaths.length} slides)`);
      },

      async toPNGsAndPDF(outputDir, pdfPath) {
        const pngPaths = await this.toPNGs(outputDir);
        await this.toPDF(pdfPath, pngPaths);
      },

      // ── Narakeet API submission ──────────────────────────────────────────
      // Retrieves NARAKEET_API_KEY from env or gcloud CLI,
      // uploads the narakeet.zip, polls for completion, downloads the .mp4.
      async submitToNarakeet(outputDir, opts = {}) {
        const NARAKEET_BASE = 'https://api.narakeet.com';
        const SCRIPT_NAME   = 'narakeet-script.md';
        const zipPath = path.join(outputDir, 'narakeet.zip');
        if (!fs.existsSync(zipPath)) {
          throw new Error('narakeet.zip not found — run toPNGs() or toPNGsAndPDF() first');
        }

        // ── 1. Resolve API key ──────────────────────────────────────────
        // Priority: env var → gcloud CLI (no Secret Manager Node client needed)
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
            // gcloud not available — expected in sandbox environments
          }
        }
        if (!apiKey) {
          throw new Error('No NARAKEET_API_KEY available. Set the NARAKEET_API_KEY environment variable.');
        }

        let axios;
        const skillNM2 = path.join(__dirname, '..', 'node_modules');
        try { axios = require('axios'); } catch (e) {
          try { axios = require(path.join(skillNM2, 'axios')); } catch (e2) {
            throw new Error('axios not installed — cannot submit to Narakeet');
          }
        }

        const headers = { 'x-api-key': apiKey };

        // ── 2. Request upload token ─────────────────────────────────────
        console.log('  Requesting Narakeet upload token...');
        const tokenRes = await axios.get(`${NARAKEET_BASE}/video/upload-request/zip`, {
          headers, timeout: 30000,
        });
        const { url: uploadUrl, contentType, repositoryType, repository } = tokenRes.data;

        // ── 3. Upload ZIP ───────────────────────────────────────────────
        const zipSize = fs.statSync(zipPath).size;
        console.log(`  Uploading narakeet.zip (${(zipSize / 1024 / 1024).toFixed(1)} MB)...`);
        const zipStream = fs.createReadStream(zipPath);
        await axios.put(uploadUrl, zipStream, {
          headers: { 'Content-Type': contentType, 'Content-Length': zipSize },
          maxBodyLength: 512 * 1024 * 1024,
          timeout: 300000,
        });
        console.log('  Upload complete.');

        // ── 4. Request build ────────────────────────────────────────────
        console.log('  Requesting Narakeet build...');
        const buildRes = await axios.post(`${NARAKEET_BASE}/video/build`, {
          repositoryType, repository, source: SCRIPT_NAME,
        }, {
          headers: { ...headers, 'Content-Type': 'application/json' },
          timeout: 60000,
        });
        const { statusUrl } = buildRes.data;
        console.log(`  Build started. Polling: ${statusUrl}`);

        // ── 5. Poll for completion ──────────────────────────────────────
        const pollInterval = slides.length > 15 ? 15000 : 5000;
        const maxPolls = Math.ceil(600000 / pollInterval); // 10 min max
        let pollCount = 0;
        let result;

        while (true) {
          const statusRes = await axios.get(statusUrl, { timeout: 30000 });
          result = statusRes.data;

          if (result.finished) break;

          pollCount++;
          if (pollCount >= maxPolls) {
            throw new Error(`Narakeet polling timeout after ${pollCount} attempts (~${Math.round(pollCount * pollInterval / 60000)} min)`);
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

        // ── 6. Download video ───────────────────────────────────────────
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
      },
    };
    return pres;
  }

  return createPresentation;
};
