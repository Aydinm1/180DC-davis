import { fromBuffer, type Entry } from 'yauzl';
import { fileError, fileMime, isImageMime, MAX_FILE_BYTES } from './format.ts';
import { inspectImage } from './image.ts';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Bounded format checks, NOT antivirus or a guarantee that a document is safe.
export async function inspectFile(bytes: Buffer, name: string, mime: string, expectedSize: number) {
  if (fileError({ name, size: bytes.length, type: mime }) || bytes.length !== expectedSize || bytes.length > MAX_FILE_BYTES) throw new Error('Invalid file size or type.');
  if (isImageMime(mime)) return inspectImage(bytes, mime);
  if (fileMime(name) === 'application/pdf') {
    if (!/^%PDF-1\.[0-7]|^%PDF-2\.0/.test(bytes.subarray(0, 8).toString('ascii')) || !bytes.subarray(-1024).toString('ascii').includes('%%EOF')) throw new Error('Invalid PDF.');
    return;
  }
  const ext = name.split('.').pop()!.toLowerCase();
  const main = { docx: 'word/document.xml', pptx: 'ppt/presentation.xml', xlsx: 'xl/workbook.xml' }[ext];
  const contentType = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml' }[ext];
  await new Promise<void>((resolve, reject) => {
    fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid Office package.'));
      let count = 0, total = 0, finished = false;
      const seen = new Set<string>();
      const xml = new Map<string, string>();
      function fail() { if (!finished) { finished = true; zip.close(); reject(new Error('Invalid or overly complex Office package.')); } }
      zip.on('error', fail);
      zip.on('entry', (entry: Entry) => {
        total += entry.uncompressedSize;
        if (++count > 4096 || total > 100 * 1024 * 1024 || entry.generalPurposeBitFlag & 1 || seen.has(entry.fileName) || /(^|\/)\.\.(\/|$)|\\/.test(entry.fileName)) return fail();
        seen.add(entry.fileName);
        if (!['[Content_Types].xml', '_rels/.rels', main].includes(entry.fileName)) return zip.readEntry();
        if (entry.uncompressedSize > 4 * 1024 * 1024) return fail();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail();
          const chunks: Buffer[] = []; let size = 0;
          stream.on('error', fail);
          stream.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 4 * 1024 * 1024) { stream.destroy(); fail(); } else chunks.push(chunk); });
          stream.on('end', () => { if (!finished) { xml.set(entry.fileName, Buffer.concat(chunks).toString('utf8')); zip.readEntry(); } });
        });
      });
      zip.on('end', () => {
        if (finished) return;
        try {
        const types = xml.get('[Content_Types].xml') ?? '';
        const relationships = xml.get('_rels/.rels') ?? '';
        const document = main ? xml.get(main) ?? '' : '';
        if (!main || !contentType || [...xml.values()].some(value => /<!DOCTYPE|<!ENTITY/i.test(value) || XMLValidator.validate(value) !== true)) return fail();
        const parser = new XMLParser({ ignoreAttributes: false, processEntities: false, removeNSPrefix: true });
        const parsedTypes = parser.parse(types)?.Types?.Override;
        const overrides = Array.isArray(parsedTypes) ? parsedTypes : [parsedTypes];
        const parsedRels = parser.parse(relationships)?.Relationships?.Relationship;
        const rels = Array.isArray(parsedRels) ? parsedRels : [parsedRels];
        const root = { docx: 'document', pptx: 'presentation', xlsx: 'workbook' }[ext]!;
        if (!overrides.some(value => value?.['@_PartName'] === '/' + main && value?.['@_ContentType'] === contentType)
          || !rels.some(value => value?.['@_Type']?.endsWith('/officeDocument') && [main, '/' + main].includes(value?.['@_Target']) && value?.['@_TargetMode'] !== 'External')
          || !Object.hasOwn(parser.parse(document), root)) return fail();
        finished = true; zip.close(); resolve();
        } catch { fail(); }
      });
      zip.readEntry();
    });
  });
}
