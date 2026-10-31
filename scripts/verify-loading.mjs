import assert from 'node:assert/strict';
import test from 'node:test';
import { glob, readFile, mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { chromium } from 'playwright-core';

test('actual loading component fits desktop, phone and short screens', async t => {
  const source = await readFile('src/app/loading.tsx', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(createRequire(import.meta.url), exports);
  const markup = renderToStaticMarkup(createElement(exports.default));
  const sheets = [];
  for await (const path of glob('.next/static/css/**/*.css')) sheets.push(await readFile(path, 'utf8'));
  assert.ok(sheets.length, 'Build before verifying generated loading styles');
  const logo = await readFile('public/brand/180dc-uc-davis-landscape-dark.png');
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/_next/image') || req.url === '/brand/180dc-uc-davis-landscape-dark.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(logo); return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${sheets.join('\n')}</style></head><body>${markup}</body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const output = await mkdtemp(join(tmpdir(), 'gap-loading-'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.GAP_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    for (const [width, height] of [[1280, 900], [390, 844], [320, 256]]) await t.test(`${width} × ${height}`, async () => {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        const status = page.getByRole('status');
        await status.waitFor();
        assert.equal(await status.textContent(), 'Loading GAP…');
        const image = status.locator('img');
        await image.evaluate(el => el.decode());
        const logoBox = await image.boundingBox();
        assert.ok(Math.abs(logoBox.x + logoBox.width / 2 - width / 2) < 2);
        assert.ok(Math.abs(logoBox.width / logoBox.height - 928 / 318) < 0.01);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.ok(logoBox.y >= 0 && logoBox.y + logoBox.height <= height);
        const indicator = status.locator('[aria-hidden=true]');
        assert.equal(await indicator.evaluate(el => getComputedStyle(el).animationName), 'pulse');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await indicator.evaluate(el => getComputedStyle(el).animationName), 'none');
        await page.screenshot({ path: join(output, `loading-${width}.png`), fullPage: true });
      } finally { await page.close(); }
    });
    console.log(`Loading screenshots: ${output}`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
