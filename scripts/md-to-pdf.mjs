#!/usr/bin/env node
/**
 * md-to-pdf.mjs — Convert a Markdown file to a publication-quality PDF.
 *
 * Features:
 *   - Renders Mermaid diagrams (no raw code blocks in the output)
 *   - Embeds Palatino Linotype for an academic paper look (falls back to
 *     Liberation Serif → DejaVu Serif → Georgia → serif)
 *   - Produces a paginated A4 PDF via headless Chromium
 *
 * Usage:
 *   node scripts/md-to-pdf.mjs <input.md> [output.pdf]
 *
 * If output.pdf is omitted the PDF is written next to the source file
 * with the same base name.
 *
 * Prerequisites (install once from the scripts/ directory):
 *   npm install          # or: pnpm install
 *
 * Chromium must be installed on the system. Adjust CHROMIUM_PATH if needed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ── Resolve paths relative to this script ────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const require    = createRequire(import.meta.url);

// ── Dependencies (resolved from scripts/node_modules) ────────────────────────
// Node resolves bare specifiers from the script's own node_modules first.
const { marked }   = require('marked');
const MERMAID_PATH = join(__dirname, 'node_modules/mermaid/dist/mermaid.min.js');

// Resolve puppeteer-core entry via its package exports (path differs across versions)
const PUPPETEER_ESM = join(
  __dirname,
  'node_modules/puppeteer-core',
  JSON.parse(readFileSync(join(__dirname, 'node_modules/puppeteer-core/package.json'), 'utf8'))
    .exports['.'].import
    .replace(/^\.\//, '')
);
const { default: puppeteer } = await import(PUPPETEER_ESM);

// ── Config ───────────────────────────────────────────────────────────────────
const CHROMIUM_PATH = '/usr/bin/chromium-browser';

// Palatino Linotype via WSL2 Windows fonts mount; extend as needed for other OSes.
const FONT_SOURCES = [
  {
    family: 'Palatino Linotype',
    files: {
      regular:    '/mnt/c/Windows/Fonts/pala.ttf',
      bold:       '/mnt/c/Windows/Fonts/palab.ttf',
      italic:     '/mnt/c/Windows/Fonts/palai.ttf',
      boldItalic: '/mnt/c/Windows/Fonts/palabi.ttf',
    },
  },
  {
    family: 'Liberation Serif',
    files: {
      regular:    '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
      bold:       '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
      italic:     '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf',
      boldItalic: '/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf',
    },
  },
];

// ── CLI args ─────────────────────────────────────────────────────────────────
const [,, inputArg, outputArg] = process.argv;
if (!inputArg) {
  console.error('Usage: node md-to-pdf.mjs <input.md> [output.pdf]');
  process.exit(1);
}

const inputPath  = resolve(inputArg);
const outputPath = outputArg
  ? resolve(outputArg)
  : join(dirname(inputPath), basename(inputPath, '.md') + '.pdf');

if (!existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

// ── Font loading ─────────────────────────────────────────────────────────────
function loadFontFamily(source) {
  const { family, files } = source;
  const all = Object.values(files).every(existsSync);
  if (!all) return null;

  const toDataUri = path =>
    'data:font/truetype;base64,' + readFileSync(path).toString('base64');

  return `
    @font-face {
      font-family: '${family}';
      font-weight: normal;
      font-style: normal;
      src: url('${toDataUri(files.regular)}') format('truetype');
    }
    @font-face {
      font-family: '${family}';
      font-weight: bold;
      font-style: normal;
      src: url('${toDataUri(files.bold)}') format('truetype');
    }
    @font-face {
      font-family: '${family}';
      font-weight: normal;
      font-style: italic;
      src: url('${toDataUri(files.italic)}') format('truetype');
    }
    @font-face {
      font-family: '${family}';
      font-weight: bold;
      font-style: italic;
      src: url('${toDataUri(files.boldItalic)}') format('truetype');
    }
  `;
}

let fontCss   = '';
let fontStack = 'Georgia, "Times New Roman", Times, serif';

for (const source of FONT_SOURCES) {
  const css = loadFontFamily(source);
  if (css) {
    fontCss   = css;
    fontStack = `'${source.family}', Georgia, "Times New Roman", Times, serif`;
    console.log(`Using font: ${source.family}`);
    break;
  }
}

// ── Markdown → HTML ──────────────────────────────────────────────────────────
let src = readFileSync(inputPath, 'utf8');
src = src.replace(/^---[\s\S]*?---\n/, ''); // strip YAML frontmatter

let body = marked.parse(src);

// Convert ```mermaid blocks to <div class="mermaid"> for mermaid.js
body = body.replace(
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
  (_, encoded) => {
    const decoded = encoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `<div class="mermaid">${decoded}</div>`;
  }
);

// ── Build HTML ───────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${fontCss}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: ${fontStack};
  font-size: 11.5pt;
  line-height: 1.65;
  color: #111;
  max-width: 680px;
  margin: 0 auto;
  padding: 56px 0 64px;
}

/* Title block */
h1 {
  font-size: 17pt;
  font-weight: bold;
  line-height: 1.25;
  margin-bottom: 0.5em;
  text-align: center;
}

/* Author / date line rendered as bold paragraph immediately after h1 */
h1 + p strong {
  font-size: 10.5pt;
  font-weight: normal;
  font-style: italic;
  display: block;
  text-align: center;
  margin-bottom: 1.8em;
  color: #333;
}

h2 {
  font-size: 12.5pt;
  font-weight: bold;
  margin-top: 2.2em;
  margin-bottom: 0.5em;
}

h3 {
  font-size: 11.5pt;
  font-weight: bold;
  font-style: italic;
  margin-top: 1.6em;
  margin-bottom: 0.4em;
}

h4 {
  font-size: 11pt;
  font-weight: bold;
  margin-top: 1.2em;
  margin-bottom: 0.3em;
}

p { margin-bottom: 0.75em; text-align: justify; }

/* First paragraph of each section — no indent */
h2 + p, h3 + p, h4 + p { text-indent: 0; }

ul, ol { margin: 0.5em 0 0.8em 1.6em; }
li { margin-bottom: 0.25em; }

strong { font-weight: bold; }
em     { font-style: italic; }

/* Abstract section — slightly indented */
h2:first-of-type + p {
  font-size: 10.5pt;
  margin: 0 1.5em 1em;
}

code {
  font-family: "Courier New", "Lucida Console", monospace;
  font-size: 9pt;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 2px;
}

pre {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 10px 14px;
  border-radius: 3px;
  margin: 0.9em 0;
  font-size: 8.5pt;
  line-height: 1.45;
  overflow-x: auto;
}

pre code { background: none; padding: 0; border-radius: 0; }

blockquote {
  border-left: 3px solid #aaa;
  padding-left: 1em;
  color: #444;
  margin: 0.9em 0;
  font-style: italic;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 10pt;
}

th, td {
  border: 1px solid #ccc;
  padding: 5px 9px;
  text-align: left;
}

th {
  background: #f0f0f0;
  font-weight: bold;
}

hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}

.mermaid {
  margin: 1.4em 0;
  text-align: center;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}

@media print {
  body { padding: 0; }
}
</style>
</head>
<body>
${body}
</body>
</html>`;

// ── Generate PDF ─────────────────────────────────────────────────────────────
console.log(`Converting: ${inputPath}`);
console.log(`Output:     ${outputPath}`);

const browser = await puppeteer.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Inject and run mermaid for diagram rendering
  await page.addScriptTag({ path: MERMAID_PATH });
  await page.evaluate(async () => {
    window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    await window.mermaid.run();
  });

  // Wait for SVG rendering to settle
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '22mm', right: '24mm', bottom: '22mm', left: '24mm' },
  });

  console.log('Done.');
} finally {
  await browser.close();
}
