// Server-side decoding only. Keep native Sharp out of client-side upload validation.
import sharp from 'sharp';
import { isImageMime, MAX_FILE_BYTES } from './format.ts';
import { jpegParts } from './jpeg.ts';

export const MAX_IMAGE_PIXELS = 50_000_000;
const invalid = 'Choose a valid, still PNG, JPEG, or WebP image up to 50 megapixels.';

function rejectAnimatedPng(bytes: Buffer) {
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    if (size > bytes.length - offset - 12) throw new Error(invalid);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'acTL') throw new Error(invalid);
    offset += size + 12;
    if (type === 'IEND') return;
  }
  throw new Error(invalid);
}

async function decoder(bytes: Buffer, mime: string) {
  if (!isImageMime(mime) || bytes.length < 1 || bytes.length > MAX_FILE_BYTES) throw new Error(invalid);
  const parts = mime === 'image/jpeg' ? jpegParts(bytes) : { primary: bytes };
  const image = sharp(parts.primary, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning', sequentialRead: true });
  const metadata = await image.metadata();
  const expected = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' }[mime];
  if (metadata.format !== expected || !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS
    || (metadata.pages ?? 1) !== 1) throw new Error(invalid);
  if (metadata.format === 'png') rejectAnimatedPng(bytes);
  if (parts.gainMap) {
    const auxiliary = sharp(parts.gainMap, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning', sequentialRead: true });
    const aux = await auxiliary.metadata();
    if (aux.format !== 'jpeg' || !aux.width || !aux.height || (aux.pages ?? 1) !== 1
      || aux.width > metadata.width || aux.height > metadata.height) throw new Error(invalid);
    await auxiliary.timeout({ seconds: 10 }).raw().toBuffer();
  }
  return image;
}

export async function inspectImage(bytes: Buffer, mime: string) {
  const image = await decoder(bytes, mime);
  // Decode all pixels; headers alone do not prove that the image is intact.
  await image.timeout({ seconds: 10 }).raw().toBuffer();
}

export async function imagePreview(bytes: Buffer, mime: string) {
  const image = await decoder(bytes, mime);
  // A fresh PNG strips metadata and never returns the original untrusted container inline.
  return image.timeout({ seconds: 10 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
}
