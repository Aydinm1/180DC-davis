import { XMLParser, XMLValidator } from 'fast-xml-parser';

const invalid = () => new Error('Invalid JPEG or unsupported multipicture image.');
const xmpSignature = Buffer.from('http://ns.adobe.com/xap/1.0/\0');
const auxiliaryNamespace = 'http://ns.apple.com/pixeldatainfo/1.0/';
const gainMapType = 'urn:com:apple:photo:2020:aux:hdrgainmap';
const androidNamespace = 'http://ns.adobe.com/hdr-gain-map/1.0/';
const itemNamespace = 'http://ns.google.com/photos/1.0/container/item/';
const property = (namespace: string, name: string) => `${namespace}\0${name}`;

/** Walk bounded JPEG headers only; never search compressed pixels for metadata. */
function headers(bytes: Buffer) {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) throw invalid();
  const segments: { marker: number; start: number; data: Buffer }[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 0xff) throw invalid();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker >= 0xd0 && marker <= 0xd7 || marker === 0x01) continue;
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) throw invalid();
    if (marker === 0xda) return segments;
    if (segments.length >= 512) throw invalid();
    segments.push({ marker, start: offset + 2, data: bytes.subarray(offset + 2, offset + size) });
    offset += size;
  }
  throw invalid();
}

function xmpNodes(data: Buffer): Map<string, string>[] {
  if (!data.subarray(0, xmpSignature.length).equals(xmpSignature)) return [];
  const xml = data.subarray(xmpSignature.length).toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) return [];
  const parsed: unknown = new XMLParser({ ignoreAttributes: false, processEntities: false, parseTagValue: false }).parse(xml);
  const pending = [{ value: parsed, namespaces: {} as Record<string, string>, depth: 0 }];
  const nodes: Map<string, string>[] = [];
  let count = 0;
  while (pending.length) {
    const { value, namespaces, depth } = pending.pop()!;
    if (++count > 512 || depth > 32) return [];
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) { for (let i = value.length - 1; i >= 0; i--) pending.push({ value: value[i], namespaces, depth: depth + 1 }); continue; }
    const scope = { ...namespaces };
    const properties = new Map<string, string>();
    for (const [key, item] of Object.entries(value)) if (key.startsWith('@_xmlns:') && typeof item === 'string') scope[key.slice(8)] = item;
    for (const [key, item] of Object.entries(value)) {
      const name = key.replace(/^@_/, ''), separator = name.indexOf(':');
      if (separator > 0 && scope[name.slice(0, separator)] && typeof item === 'string') {
        const key = property(scope[name.slice(0, separator)], name.slice(separator + 1));
        if (properties.has(key)) return [];
        properties.set(key, item);
      }
      if (!key.startsWith('@_')) pending.push({ value: item, namespaces: scope, depth: depth + 1 });
    }
    nodes.push(properties);
  }
  return nodes;
}

/** Check scan boundaries too: a second JPEG or arbitrary gap is not primary-image data. */
function completeJpeg(bytes: Buffer) {
  let offset = 2, scanning = false;
  while (offset < bytes.length) {
    if (scanning) offset = bytes.indexOf(0xff, offset);
    if (offset < 0 || bytes[offset++] !== 0xff) throw invalid();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0 && scanning || marker >= 0xd0 && marker <= 0xd7 || marker === 0x01) continue;
    if (marker === 0xd9) { if (offset !== bytes.length) throw invalid(); return; }
    if (marker === 0 || marker === 0xd8 || offset + 2 > bytes.length) throw invalid();
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) throw invalid();
    offset += size; scanning = marker === 0xda;
  }
  throw invalid();
}

function androidGainMap(primary: ReturnType<typeof headers>, auxiliary: Map<string, string>[], size: number) {
  const version = property(androidNamespace, 'Version');
  if (!auxiliary.some(node => node.get(version) === '1.0')) return false;
  const nodes = primary.filter(part => part.marker === 0xe1).flatMap(part => xmpNodes(part.data));
  if (!nodes.some(node => node.get(version) === '1.0')) return false;
  const semantic = property(itemNamespace, 'Semantic'), mime = property(itemNamespace, 'Mime');
  const items = nodes.filter(node => node.has(semantic));
  const first = items[0], second = items[1];
  // Corroborate MPF with the two ordered Google container items; no extra media.
  return items.length === 2 && first.get(semantic) === 'Primary' && first.get(mime) === 'image/jpeg'
    && (!first.has(property(itemNamespace, 'Padding')) || first.get(property(itemNamespace, 'Padding')) === '0')
    && second.get(semantic) === 'GainMap' && second.get(mime) === 'image/jpeg'
    && second.get(property(itemNamespace, 'Length')) === String(size);
}

/** Accept one primary JPEG plus one explicitly identified Apple/Android HDR gain map. */
export function jpegParts(bytes: Buffer): { primary: Buffer; gainMap?: Buffer } {
  const primaryHeaders = headers(bytes);
  const mpf = primaryHeaders.filter(segment => segment.marker === 0xe2 && segment.data.toString('ascii', 0, 4) === 'MPF\0');
  if (!mpf.length) { completeJpeg(bytes); return { primary: bytes }; }
  if (mpf.length !== 1) throw invalid();
  const segment = mpf[0], tiff = segment.data.subarray(4);
  if (tiff.length < 8) throw invalid();
  const little = tiff.toString('ascii', 0, 2) === 'II';
  if (!little && tiff.toString('ascii', 0, 2) !== 'MM') throw invalid();
  function u16(offset: number) {
    if (offset < 0 || offset + 2 > tiff.length) throw invalid();
    return little ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
  }
  function u32(offset: number) {
    if (offset < 0 || offset + 4 > tiff.length) throw invalid();
    return little ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);
  }
  if (u16(2) !== 42) throw invalid();
  const ifd = u32(4), count = u16(ifd);
  if (ifd < 8 || count > 32 || ifd + 2 + count * 12 + 4 > tiff.length || u32(ifd + 2 + count * 12) !== 0) throw invalid();
  const tags = new Map<number, { type: number; count: number; value: number }>();
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12, tag = u16(entry);
    if (tags.has(tag)) throw invalid();
    tags.set(tag, { type: u16(entry + 2), count: u32(entry + 4), value: u32(entry + 8) });
  }
  const version = tags.get(0xb000), images = tags.get(0xb001), entries = tags.get(0xb002);
  if (version?.type !== 7 || version.count !== 4 || version.value !== (little ? 0x30303130 : 0x30313030)
    || images?.type !== 4 || images.count !== 1 || images.value !== 2 || entries?.type !== 7 || entries.count !== 32) throw invalid();
  const entry = entries.value;
  if (entry < ifd + 2 + count * 12 + 4 || entry + 32 > tiff.length) throw invalid();
  const primarySize = u32(entry + 4), secondarySize = u32(entry + 20);
  const secondaryStart = segment.start + 4 + u32(entry + 24);
  // JPEG encoding only; require a primary image and a non-thumbnail auxiliary entry.
  if ((u32(entry) & 0x07ffffff) !== 0x00030000 || u32(entry + 8) !== 0
    || (u32(entry + 16) & 0x07ffffff) !== 0 || primarySize < segment.start + segment.data.length
    || secondaryStart < primarySize || secondarySize < 4 || secondaryStart + secondarySize !== bytes.length) throw invalid();
  const primary = bytes.subarray(0, secondaryStart), gainMap = bytes.subarray(secondaryStart);
  headers(primary);
  const auxiliaryHeaders = headers(gainMap);
  const nodes = auxiliaryHeaders.filter(part => part.marker === 0xe1).flatMap(part => xmpNodes(part.data));
  const apple = nodes.some(node => node.get(property(auxiliaryNamespace, 'AuxiliaryImageType')) === gainMapType);
  const android = androidGainMap(primaryHeaders, nodes, secondarySize);
  if (auxiliaryHeaders.some(part => part.marker === 0xe2 && part.data.toString('ascii', 0, 4) === 'MPF\0') || !apple && !android) throw invalid();
  // Early Pixel encoders undercounted the primary length. Only the verified secondary
  // offset may define its actual end; completeJpeg forbids skipped or appended content.
  if (secondaryStart !== primarySize && !android) throw invalid();
  completeJpeg(primary); completeJpeg(gainMap);
  return { primary, gainMap };
}
