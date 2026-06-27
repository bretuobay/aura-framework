#!/usr/bin/env node
/**
 * md-to-docx.mjs — Convert a Markdown file to a .docx document.
 *
 * Usage:
 *   node scripts/md-to-docx.mjs <input.md> [output.docx]
 *
 * If output.docx is omitted the file is written next to the source with
 * the same base name.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

const { marked }      = require('marked');
const HTMLtoDOCX      = require('html-to-docx');

// ── CLI args ─────────────────────────────────────────────────────────────────
const [,, inputArg, outputArg] = process.argv;
if (!inputArg) {
  console.error('Usage: node md-to-docx.mjs <input.md> [output.docx]');
  process.exit(1);
}

const inputPath  = resolve(inputArg);
const outputPath = outputArg
  ? resolve(outputArg)
  : join(dirname(inputPath), basename(inputPath, '.md') + '.docx');

if (!existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

// ── Markdown → HTML ──────────────────────────────────────────────────────────
let src = readFileSync(inputPath, 'utf8');
src = src.replace(/^---[\s\S]*?---\n/, ''); // strip YAML frontmatter

const body = marked.parse(src);

const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>${body}</body>
</html>`;

// ── HTML → DOCX ──────────────────────────────────────────────────────────────
console.log(`Converting: ${inputPath}`);
console.log(`Output:     ${outputPath}`);

const docxBuffer = await HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: true,
  pageNumber: true,
  font: 'Palatino Linotype',
  fontSize: 24,        // half-points: 24 = 12pt
  title: basename(inputPath, '.md'),
});

writeFileSync(outputPath, docxBuffer);
console.log('Done.');
