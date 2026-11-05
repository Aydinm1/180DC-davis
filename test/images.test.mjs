import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { fileAccept, fileError, fileMime, isImageMime, MAX_FILE_BYTES } from '../src/lib/uploads/format.ts';
import { inspectFile } from '../src/lib/uploads/inspect.ts';
import { imagePreview } from '../src/lib/uploads/image.ts';
import { hdrJpeg, androidDirectory } from './jpeg-fixtures.mjs';
import { jpegParts } from '../src/lib/uploads/jpeg.ts';

const picture = () => sharp({ create: { width: 80, height: 40, channels: 3, background: '#55b441' } });

test('Android Ultra HDR validates directory, identities, legacy offsets and complete JPEG ranges', async () => {
  for (const little of [false, true]) for (const legacyUndercount of [0, 307]) {
    const { bytes } = await hdrJpeg({ kind: 'android', little, legacyUndercount });
    await inspectFile(bytes, 'pixel.jpg', 'image/jpeg', bytes.length);
    const meta = await sharp(await imagePreview(bytes, 'image/jpeg')).metadata();
    assert.equal(meta.width, 40); assert.equal(meta.height, 80); assert.equal(meta.exif, undefined);
  }
  const baseline = await hdrJpeg({ kind: 'android' });
  const length = jpegParts(baseline.bytes).gainMap.length;
  for (const primaryXmp of [
    '<x/>', androidDirectory(length + 1), androidDirectory(length).replace('GainMap', 'MotionPhoto'),
    androidDirectory(length).replace('i:Mime="image/jpeg"', 'i:Mime="video/mp4"'),
    androidDirectory(length).replace('h:Version="1.0"', 'h:Version="2.0"'),
    androidDirectory(length).replace('http://ns.google.com/photos/1.0/container/item/', 'https://example.com/'),
    androidDirectory(length).replace('i:Semantic="Primary"', 'i:Semantic="Primary" i:Padding="8"'),
    '<x><!-- http://ns.adobe.com/hdr-gain-map/1.0/ Version="1.0" --></x>',
  ]) {
    const { bytes } = await hdrJpeg({ kind: 'android', primaryXmp });
    await assert.rejects(inspectFile(bytes, 'bad-directory.jpg', 'image/jpeg', bytes.length));
  }
  for (const xmp of ['<x/>', '<x xmlns:h="https://example.com/" h:Version="1.0"/>', '<x>']) {
    const { bytes } = await hdrJpeg({ kind: 'android', xmp });
    await assert.rejects(inspectFile(bytes, 'bad-aux.jpg', 'image/jpeg', bytes.length));
  }
  // A legacy length mismatch cannot hide junk or another JPEG before the gain map.
  const { bytes, primarySize } = await hdrJpeg({ kind: 'android' });
  const junk = Buffer.from('junk');
  const forged = Buffer.concat([bytes.subarray(0, primarySize), junk, bytes.subarray(primarySize)]);
  forged.writeUInt32BE(primarySize + junk.length - 10, 84);
  await assert.rejects(inspectFile(forged, 'gap.jpg', 'image/jpeg', forged.length));
  const plain = await picture().jpeg({ progressive: true }).toBuffer();
  await inspectFile(plain, 'progressive.jpg', 'image/jpeg', plain.length);
  const appended = Buffer.concat([plain, plain]);
  await assert.rejects(inspectFile(appended, 'two-photos.jpg', 'image/jpeg', appended.length));
});

test('Apple HDR JPEGs allow one bounded gain map, not arbitrary or malformed multipicture files', async () => {
  for (const little of [false, true]) {
    const { bytes } = await hdrJpeg({ little });
    await inspectFile(bytes, 'iphone.jpeg', 'image/jpeg', bytes.length);
    const preview = await sharp(await imagePreview(bytes, 'image/jpeg')).metadata();
    assert.equal(preview.width, 40); assert.equal(preview.height, 80);
    assert.equal(preview.exif, undefined); assert.equal(preview.icc, undefined);
    for (const [offset, value] of [[28, 0], [40, 3], [48, 48], [52, 0xffffffff], [64, 1], [80, 0xffffffff], [84, 0]]) {
      const forged = Buffer.from(bytes);
      if (little) forged.writeUInt32LE(value, offset); else forged.writeUInt32BE(value, offset);
      await assert.rejects(inspectFile(forged, 'bad.jpeg', 'image/jpeg', forged.length));
    }
    await assert.rejects(inspectFile(bytes.subarray(0, bytes.length - 20), 'cut.jpeg', 'image/jpeg', bytes.length - 20));
  }
  for (const xmp of [
    '<x/>',
    '<x><!-- urn:com:apple:photo:2020:aux:hdrgainmap --></x>',
    '<x xmlns:a="https://example.com"><a:AuxiliaryImageType>urn:com:apple:photo:2020:aux:hdrgainmap</a:AuxiliaryImageType></x>',
    '<!DOCTYPE x [<!ENTITY a "x">]><x>&a;</x>',
    '<x>',
  ]) {
    const { bytes } = await hdrJpeg({ xmp });
    await assert.rejects(inspectFile(bytes, 'unrelated.jpeg', 'image/jpeg', bytes.length));
  }
  const { bytes: oversizedAux } = await hdrJpeg({ auxWidth: 81 });
  await assert.rejects(inspectFile(oversizedAux, 'oversized-aux.jpeg', 'image/jpeg', oversizedAux.length));
  const { bytes, primarySize } = await hdrJpeg();
  const corrupt = Buffer.from(bytes); corrupt.fill(0, primarySize + 2, corrupt.length - 2);
  await assert.rejects(inspectFile(corrupt, 'corrupt-aux.jpeg', 'image/jpeg', corrupt.length));
  await assert.rejects(imagePreview(corrupt, 'image/jpeg'));
  const sos = bytes.indexOf(Buffer.from([255, 218]), primarySize);
  const corruptPixels = Buffer.concat([bytes.subarray(0, sos + 2 + bytes.readUInt16BE(sos + 2)), Buffer.from([255, 217])]);
  corruptPixels.writeUInt32BE(corruptPixels.length - primarySize, 80);
  await assert.rejects(inspectFile(corruptPixels, 'corrupt-pixels.jpeg', 'image/jpeg', corruptPixels.length));
});

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
  for (const [width, height] of [[5712, 4284], [8064, 6048]]) {
    const photo = await sharp({ create: { width, height, channels: 3, background: 'white' } }).jpeg().toBuffer();
    await inspectFile(photo, 'camera.jpeg', 'image/jpeg', photo.length);
    const preview = await sharp(await imagePreview(photo, 'image/jpeg')).metadata();
    assert.equal(preview.width, 1600); assert.equal(preview.height, 1200);
  }
  const large = await sharp({ create: { width: 10000, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  await inspectFile(large, 'limit.png', 'image/png', large.length);
  const bounded = await sharp(await imagePreview(large, 'image/png')).metadata();
  assert.equal(bounded.width, 1600); assert.equal(bounded.height, 800);
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
  const huge = await sharp({ create: { width: 10001, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(inspectFile(huge, 'huge.png', 'image/png', huge.length));
  await assert.rejects(imagePreview(huge, 'image/png'));
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
