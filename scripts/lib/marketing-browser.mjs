import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const title = '180 Degrees Consulting at UC Davis';
const description = 'The public website of 180 Degrees Consulting at UC Davis.';
const cookieHeader = jar => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');

export async function verifyMarketingHttp({ appUrl, fixture, jarFor, sql }) {
  const people = [await fixture('member'), await fixture('viewer'), await fixture('admin')];
  const ids = people.map(p => `'${p.personId}'`).join(',');
  const snapshot = () => sql(`select coalesce(jsonb_agg(a order by person_id),'[]') from private.account_activity a where person_id in (${ids})`);
  const before = await snapshot();
  let publicHtml;
  for (const person of [null, ...people]) for (const expired of person ? [false, true] : [false]) {
    const jar = await jarFor(person, expired, expired);
    const response = await fetch(appUrl + '/landing', { redirect: 'manual', headers: { cookie: cookieHeader(jar) } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.deepEqual(response.headers.getSetCookie(), [], 'Marketing must not refresh or delete GAP sessions');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`name="description" content="${description}"`));
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    for (const field of ['og:title', 'og:site_name', 'twitter:title']) assert.ok(html.includes(`="${field}" content="${title}"`));
    assert.doesNotMatch(html, /Growth Analyst Program|Welcome to GAP|Review queue|NEXT_REDIRECT|Published test instructions/);
    assert.ok(html.includes('name="twitter:card" content="summary"'));
    assert.ok(html.includes('180dc-uc-davis-landscape-dark.png'));
    if (publicHtml) assert.equal(html, publicHtml, 'Public HTML must not vary with identity or session');
    publicHtml = html;
  }
  const nested = await fetch(appUrl + '/landing/not-created', { redirect: 'manual' });
  assert.equal(nested.status, 404);
  assert.equal(nested.headers.get('x-robots-tag'), 'noindex, nofollow');
  for (const path of ['/login', '/landing-other']) {
    const response = await fetch(appUrl + path, { redirect: 'manual' });
    assert.equal(response.headers.get('x-robots-tag'), null, 'Landing headers must not leak to other paths');
  }
  assert.equal(await snapshot(), before, 'Public visits must not record activity');
}

export async function verifyMarketingBrowser({ appUrl, fixture, jarFor, sql }) {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.GAP_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const screenshots = await mkdtemp(join(tmpdir(), 'gap-marketing-'));
  try {
    for (const width of [1280, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 850 } });
      const page = await context.newPage();
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', r => requests.push({ url: new URL(r.url()), method: r.method() }));
      await page.goto(appUrl + '/landing');
      await page.getByRole('heading', { level: 1, name: title }).waitFor();
      await page.waitForLoadState('networkidle');
      const image = page.getByRole('img', { name: title });
      await image.evaluate(el => el.decode());
      assert.equal(await page.getByRole('navigation').count(), 1);
      assert.equal(await page.getByRole('link').count(), 2, 'Only the skip and working GAP links belong in the starter');
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to content' });
      assert.equal(await skip.evaluate(el => el === document.activeElement), true);
      assert.equal(await skip.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');
      await skip.focus(); await page.keyboard.press('Tab');
      const portal = page.getByRole('link', { name: 'Open GAP' });
      assert.equal(await portal.evaluate(el => el === document.activeElement), true);
      await portal.hover();
      await page.waitForLoadState('networkidle');
      assert.ok(!requests.some(r => r.method === 'POST' || r.url.pathname === '/' || r.url.pathname.startsWith('/auth/') || r.url.pathname.startsWith('/rest/') || r.url.pathname.startsWith('/storage/')));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: join(screenshots, `landing-${width}.png`), fullPage: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 1280) {
        await portal.click();
        await page.getByRole('heading', { name: 'Welcome to GAP', exact: true }).waitFor();
        assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 0);
        assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(246, 247, 244)', 'Marketing CSS must not recolor GAP after navigation');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    for (const role of ['member', 'viewer', 'admin']) {
      const person = await fixture(role), jar = await jarFor(person, true, true);
      const context = await browser.newContext();
      await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: appUrl })));
      const before = await context.cookies();
      const page = await context.newPage(), writes = [];
      page.on('request', r => { if (r.method() === 'POST') writes.push(r.url()); });
      await page.goto(appUrl + '/landing');
      await page.getByRole('heading', { name: title, exact: true }).waitFor();
      await page.waitForLoadState('networkidle');
      assert.deepEqual(await context.cookies(), before);
      assert.deepEqual(writes, []);
      assert.equal(await sql(`select count(*) from private.account_activity where person_id='${person.personId}'`), '0');
      await context.close();
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const page = await noScript.newPage();
    await page.goto(appUrl + '/landing');
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open GAP' }).getAttribute('href'), '/');
    await noScript.close();
    console.log('Marketing screenshots: ' + screenshots);
  } finally { await browser.close(); }
}
