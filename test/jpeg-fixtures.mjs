import sharp from 'sharp';

// Synthetic HDR container only; no personal camera images belong in fixtures.
export async function hdrJpeg({ little = false, kind = 'apple', xmp, primaryXmp, legacyUndercount = 0, width = 80, height = 40, auxWidth = 40, auxHeight = 20 } = {}) {
  let primary = await sharp({ create: { width, height, channels: 3, background: 'white' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  let auxiliary = await sharp({ create: { width: auxWidth, height: auxHeight, channels: 3, background: '#888' } }).jpeg().toBuffer();
  const xml = xmp ?? (kind === 'android'
    ? '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:h="http://ns.adobe.com/hdr-gain-map/1.0/" h:Version="1.0" h:GainMapMax="2" h:HDRCapacityMax="2"/></rdf:RDF></x:xmpmeta>'
    : '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:aux="http://ns.apple.com/pixeldatainfo/1.0/"><aux:AuxiliaryImageType>urn:com:apple:photo:2020:aux:hdrgainmap</aux:AuxiliaryImageType></rdf:Description></rdf:RDF></x:xmpmeta>');
  function addXmp(bytes, value) {
    const payload = Buffer.from('http://ns.adobe.com/xap/1.0/\0' + value), app1 = Buffer.alloc(4);
    app1.writeUInt16BE(0xffe1); app1.writeUInt16BE(payload.length + 2, 2);
    return Buffer.concat([bytes.subarray(0, 2), app1, payload, bytes.subarray(2)]);
  }
  auxiliary = addXmp(auxiliary, xml);
  if (kind === 'android' || primaryXmp !== undefined) primary = addXmp(primary, primaryXmp ?? androidDirectory(auxiliary.length));
  const tiff = Buffer.alloc(82);
  const w16 = (value, offset) => little ? tiff.writeUInt16LE(value, offset) : tiff.writeUInt16BE(value, offset);
  const w32 = (value, offset) => little ? tiff.writeUInt32LE(value, offset) : tiff.writeUInt32BE(value, offset);
  tiff.write(little ? 'II' : 'MM'); w16(42, 2); w32(8, 4); w16(3, 8);
  w16(0xb000, 10); w16(7, 12); w32(4, 14); tiff.write('0100', 18);
  w16(0xb001, 22); w16(4, 24); w32(1, 26); w32(2, 30);
  w16(0xb002, 34); w16(7, 36); w32(32, 38); w32(50, 42);
  // APP2 is 90 bytes; TIFF starts at byte 10 in the combined primary JPEG.
  w32(0x00030000, 50); w32(primary.length + 90 - legacyUndercount, 54);
  w32(auxiliary.length, 70); w32(primary.length + 90 - 10, 74);
  const app2 = Buffer.from([255, 226, 0, 88]);
  return { bytes: Buffer.concat([primary.subarray(0, 2), app2, Buffer.from('MPF\0'), tiff, primary.subarray(2), auxiliary]), primarySize: primary.length + 90 };
}

export function androidDirectory(length) {
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:h="http://ns.adobe.com/hdr-gain-map/1.0/" h:Version="1.0" xmlns:c="http://ns.google.com/photos/1.0/container/" xmlns:i="http://ns.google.com/photos/1.0/container/item/"><c:Directory><rdf:Seq><rdf:li><c:Item i:Semantic="Primary" i:Mime="image/jpeg"/></rdf:li><rdf:li><c:Item i:Semantic="GainMap" i:Mime="image/jpeg" i:Length="${length}"/></rdf:li></rdf:Seq></c:Directory></rdf:Description></rdf:RDF></x:xmpmeta>`;
}
