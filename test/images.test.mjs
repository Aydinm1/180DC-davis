import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { fileAccept, fileError, fileMime, isImageMime, MAX_FILE_BYTES } from '../src/lib/uploads/format.ts';
import { inspectFile } from '../src/lib/uploads/inspect.ts';
import { imagePreview } from '../src/lib/uploads/image.ts';

const picture = () => sharp({ create: { width: 80, height: 40, channels: 3, background: '#55b441' } });

test('still PNG/JPEG/WebP uploads decode and produce bounded metadata-free PNG previews', async () => {
  for (const [extension, format] of [['png','png'], ['jpg','jpeg'], ['jpeg','jpeg'], ['webp','webp']]) {
    const bytes = await picture()[format]().toBuffer(), mime = fileMime('completion.' + extension);
    await inspectFile(bytes, 'completion.' + extension, mime, bytes.length);
    const result = await sharp(await imagePreview(bytes, mime)).metadata();
    assert.equal(result.format, 'png'); assert.equal(result.width, 80); assert.equal(result.height, 40);
    assert.equal(result.exif, undefined); assert.equal(result.icc, undefined);
  }
  const oriented = await picture().jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await sharp(await imagePreview(oriented, 'image/jpeg')).metadata();
  assert.equal(result.width, 40); assert.equal(result.height, 80); assert.equal(result.orientation, undefined);
  const large = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await inspectFile(large, 'limit.png', 'image/png', large.length);
  const bounded = await sharp(await imagePreview(large, 'image/png')).metadata();
  assert.equal(bounded.width, 1600); assert.equal(bounded.height, 1280);
});

test('image validation rejects corrupt, mislabeled, truncated, animated and over-pixel inputs', async () => {
  const png = await picture().png().toBuffer();
  const jpeg = await picture().jpeg().toBuffer();
  const webp = await picture().webp().toBuffer();
  for (const [bytes, name, mime] of [
    [png, 'x.jpg', 'image/jpeg'], [jpeg, 'x.webp', 'image/webp'],
    [Buffer.from('<svg/>'), 'x.png', 'image/png'], [png.subarray(0, png.length - 20), 'x.png', 'image/png'],
    [jpeg.subarray(0, jpeg.length - 30), 'x.jpg', 'image/jpeg'], [webp.subarray(0, webp.length - 8), 'x.webp', 'image/webp'],
    [Buffer.concat([jpeg.subarray(0, 2), Buffer.from([255,226,0,6,77,80,70,0]), jpeg.subarray(2)]), 'multi.jpg', 'image/jpeg'],
  ]) await assert.rejects(inspectFile(bytes, name, mime, bytes.length));
  // APNG's animation-control chunk must be rejected even if a decoder treats it as still PNG.
  const chunk = Buffer.alloc(20); chunk.writeUInt32BE(8); chunk.write('acTL', 4); chunk.writeUInt32BE(2, 8);
  const apng = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  await assert.rejects(inspectFile(apng, 'animated.png', 'image/png', apng.length));
  const animated = await sharp(Buffer.concat([Buffer.alloc(300, 255), Buffer.alloc(300, 0)]), {
    raw: { width: 10, height: 20, pageHeight: 10, channels: 3 },
  }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
  await assert.rejects(inspectFile(animated, 'animated.webp', 'image/webp', animated.length));
  const huge = await sharp({ create: { width: 5001, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(inspectFile(huge, 'huge.png', 'image/png', huge.length));
});

test('file controls accept screenshots only outside document-only workflows', () => {
  for (const name of ['proof.PNG', 'proof.jpg', 'proof.jpeg', 'proof.webp']) {
    assert.equal(fileError({ name, size: MAX_FILE_BYTES, type: '' }), undefined);
    assert.ok(fileError({ name, size: MAX_FILE_BYTES + 1, type: '' }));
    assert.ok(fileError({ name, size: 1, type: '' }, true));
    assert.ok(isImageMime(fileMime(name)));
  }
  for (const name of ['x.svg', 'x.gif', 'x.heic', 'x.avif']) assert.ok(fileError({ name, size: 5, type: '' }));
  assert.ok(fileError({ name: 'x.png', size: 1, type: 'image/jpeg' }));
  assert.match(fileAccept(), /\.png.*image\/png/);
  assert.doesNotMatch(fileAccept(true), /png|jpeg|webp/);
});
