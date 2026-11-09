import {showReview,showWork} from './review-workspace.mjs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hdrJpeg } from '../../test/jpeg-fixtures.mjs';

export async function verifyImageSubmissions({ app, fixture, prepare, upload, finalize, current, sql, cookieJar, cohort, assignment, paths }) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(app).hostname));
  const owner = await fixture(), other = await fixture(), lead = await fixture('admin'), viewer = await fixture('viewer');
  const source = Buffer.from('<svg width="800" height="440" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="440" fill="white"/><text x="60" y="170" fill="#2f7328" font-size="36">Thank you for your feedback</text><text x="60" y="235" fill="#434343" font-size="24">Your response has been recorded.</text></svg>');
  async function request(user, id, kind = 'image') {
    const jar = await cookieJar(user);
    return fetch(`${app}/api/submissions/${id}/${kind}`, { headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') }, redirect: 'manual' });
  }
  let first;
  for (const [ext, format] of [['png','png'], ['jpg','jpeg'], ['jpeg','jpeg'], ['webp','webp']]) {
    const bytes = await sharp(source)[format]().toBuffer();
    const intent = await prepare(owner, ext, await current(owner), bytes);
    await upload(owner, intent, bytes); const receipt = await finalize(owner, intent);
    assert.equal(receipt.state, 'committed'); assert.deepEqual(await finalize(owner, intent), receipt);
    const preview = await request(lead, receipt.submissionId);
    assert.equal(preview.status, 200); assert.equal(preview.headers.get('content-type'), 'image/png');
    assert.equal(preview.headers.get('cache-control'), 'private, no-store');
    assert.equal(preview.headers.get('x-content-type-options'), 'nosniff');
    const meta = await sharp(Buffer.from(await preview.arrayBuffer())).metadata();
    assert.equal(meta.width, 800); assert.equal(meta.height, 440); assert.equal(meta.exif, undefined);
    const original = await request(owner, receipt.submissionId, 'download');
    assert.match(original.headers.get('content-disposition'), /^attachment/);
    assert.deepEqual(Buffer.from(await original.arrayBuffer()), bytes);
    first ??= receipt;
  }
  for (const kind of ['apple', 'android']) {
    const { bytes: hdr } = await hdrJpeg({ kind });
    const hdrIntent = await prepare(owner, 'jpeg', await current(owner), hdr);
    await upload(owner, hdrIntent, hdr);
    const hdrReceipt = await finalize(owner, hdrIntent);
    assert.equal(hdrReceipt.state, 'committed');
    assert.deepEqual(await finalize(owner, hdrIntent), hdrReceipt);
    const hdrPreview = await request(lead, hdrReceipt.submissionId);
    assert.equal(hdrPreview.status, 200); assert.equal(hdrPreview.headers.get('cache-control'), 'private, no-store');
    const hdrMeta = await sharp(Buffer.from(await hdrPreview.arrayBuffer())).metadata();
    assert.equal(hdrMeta.width, 40); assert.equal(hdrMeta.height, 80); assert.equal(hdrMeta.exif, undefined);
    const hdrDownload = await request(owner, hdrReceipt.submissionId, 'download');
    assert.deepEqual(Buffer.from(await hdrDownload.arrayBuffer()), hdr);
    for (const denied of [null, other, viewer]) assert.equal((await request(denied, hdrReceipt.submissionId)).status, denied ? 404 : 401);
  }
  for (const user of [null, other, viewer]) assert.equal((await request(user, first.submissionId)).status, user ? 404 : 401);
  assert.equal((await request(owner, first.submissionId)).status, 200, 'Historical image access');
  await sql(`update public.approved_members set active=false where person_id='${owner.person}'`);
  assert.equal((await request(owner, first.submissionId)).status, 404);
  await sql(`update public.cohort_enrollments set participation_status='withdrew' where person_id='${owner.person}' and cohort_id='${cohort}';update public.approved_members set active=true,role='viewer' where person_id='${owner.person}'`);
  assert.equal((await request(owner, first.submissionId)).status, 404);
  await sql(`update public.approved_members set role='member' where person_id='${owner.person}';update public.cohort_enrollments set participation_status='withdrew' where person_id='${owner.person}' and cohort_id='${cohort}'`);
  assert.equal((await request(owner, first.submissionId)).status, 200, 'Preserve individual historical-file access after withdrawal, as with downloads');
  await sql(`update public.cohort_enrollments set participation_status='enrolled' where person_id='${owner.person}' and cohort_id='${cohort}';update public.approved_members set role='member' where person_id='${lead.person}'`);
  assert.equal((await request(lead, first.submissionId)).status, 404, 'Revoked admin cannot preview another person’s file');
  await sql(`update public.approved_members set role='admin' where person_id='${lead.person}'`);

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.GAP_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const screens = await mkdtemp(join(tmpdir(), 'gap-images-'));
  try {
    for (const width of [1280, 390]) {
      const learner = await fixture(), context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies([...(await cookieJar(learner))].map(([name, value]) => ({ name, value, url: app })));
      const page = await context.newPage();
      await page.goto(`${app}/week/1/assignments/${assignment}`);
      await page.getByRole('button', { name: 'Submit assignment', exact: true }).click();
      await page.getByRole('button', { name: /^Upload file/ }).click();
      await page.getByLabel('Choose file', { exact: true }).setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.getByRole('button', { name: 'Submit assignment', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'File validation failed' }).waitFor();
      assert.equal(await current(learner), null);
      await page.getByRole('button', { name: 'Cancel upload', exact: true }).click();
      const bytes = await sharp(source).png().toBuffer();
      await page.getByLabel('Choose file', { exact: true }).setInputFiles({ name: 'completion.png', mimeType: 'image/png', buffer: bytes });
      let interruptions = 0;
      const interrupt = route => { if (route.request().method() === 'POST' && interruptions++ < 2) return route.abort(); return route.continue(); };
      await page.route('**/storage/v1/upload/resumable', interrupt);
      await page.getByRole('button', { name: 'Submit assignment', exact: true }).click();
      await page.getByRole('link', { name: 'View submission', exact: true }).waitFor();
      assert.ok(interruptions >= 3, 'Interrupted image transfer must retry');
      await page.unroute('**/storage/v1/upload/resumable', interrupt);
      const attempt = await current(learner); paths.push(attempt.file_path);
      await page.reload(); await page.getByRole('link', { name: 'View submission', exact: true }).click();
      await page.getByRole('link', { name: 'Download file', exact: true }).waitFor();

      const adminContext = await browser.newContext({ viewport: { width, height: 900 } });
      await adminContext.addCookies([...(await cookieJar(lead))].map(([name, value]) => ({ name, value, url: app })));
      const review = await adminContext.newPage();
      await review.route(`**/api/submissions/${attempt.id}/image*`, route => route.fulfill({ status: 503, body: 'Fixture preview unavailable' }));
      await review.goto(`${app}/admin/submissions/${attempt.id}?cohort=${cohort}`);
      await showWork(review);await review.getByRole('button', { name: 'Retry image preview', exact: true }).waitFor();
      const feedback = review.getByLabel(/Feedback \(/);
      await showReview(review);await feedback.fill('Completion confirmed.');
      await review.unroute(`**/api/submissions/${attempt.id}/image*`);
      await showWork(review);await review.getByRole('button', { name: 'Retry image preview', exact: true }).click();
      const image = review.getByRole('img', { name: 'Submitted image: completion.png', exact: true });
      await image.evaluate(el => el.decode()); assert.equal(await feedback.inputValue(), 'Completion confirmed.');
      assert.ok(await image.evaluate(el => Math.abs(el.getBoundingClientRect().width / el.getBoundingClientRect().height - el.naturalWidth / el.naturalHeight) < 0.01));
      assert.ok(await review.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await review.screenshot({ path: join(screens, `review-${width}.png`), fullPage: true });
      await showReview(review);await review.getByLabel('Request revision', { exact: true }).check();
      await review.getByRole('button', { name: 'Save review', exact: true }).click();
      await review.getByText('Review saved.', { exact: true }).waitFor();
      await page.reload(); await page.getByRole('button', { name: 'Revise submission', exact: true }).click();
      await page.getByRole('button', { name: /^Upload file/ }).click();
      const replacement = (await hdrJpeg({ kind: 'android' })).bytes;
      await page.getByLabel('Choose file', { exact: true }).setInputFiles({ name: 'replacement.jpg', mimeType: 'image/jpeg', buffer: replacement });
      await page.getByRole('button', { name: 'Revise submission', exact: true }).click();
      await page.getByRole('heading', { name: 'Previous submissions', exact: true }).waitFor();
      const next = await current(learner); paths.push(next.file_path);
      await review.goto(`${app}/admin/submissions/${next.id}?cohort=${cohort}`);
      await review.getByRole('img', { name: 'Submitted image: replacement.jpg', exact: true }).evaluate(el => el.decode());
      await review.getByRole('button',{name:'History (1)',exact:true}).click();
      await review.getByRole('img', { name: 'Submitted image: completion.png', exact: true }).evaluate(el => el.decode());
      await showReview(review);await review.getByLabel('Mark complete', { exact: true }).check();
      await review.getByRole('button', { name: 'Save review', exact: true }).click();
      await review.getByText('Review saved.', { exact: true }).waitFor();
      assert.equal((await current(learner)).status, 'completed');
      await context.close(); await adminContext.close();
    }
    console.log('Image submission screenshots: ' + screens);
  } finally { await browser.close(); }
}
