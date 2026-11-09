// Valid, deterministic PDFs with real xrefs; no student content or network fixtures.
export function makePdf({scanned=false,padding=0,font}={}) {
  const bodies=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  if(scanned){
    bodies.push('<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length 25 >>\nstream\nff000000ff000000ffffffff>\nendstream');
    for(const i of [2,4])bodies[i]=bodies[i].replace('/Resources <<','/Resources << /XObject << /Im1 8 0 R >>');
  }else if(font){
    bodies[6]=`<< /Type /Font /Subtype /TrueType /BaseFont /GAPFixtureFont /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [${Array(224).fill(600).join(' ')}] /FontDescriptor 8 0 R >>`;
    bodies.push('<< /Type /FontDescriptor /FontName /GAPFixtureFont /Flags 32 /FontBBox [-700 -300 2000 1100] /Ascent 900 /Descent -220 /CapHeight 700 /ItalicAngle 0 /StemV 80 /FontFile2 9 0 R >>');
    bodies.push(Buffer.concat([Buffer.from(`<< /Length ${font.length} /Length1 ${font.length} >>\nstream\n`),font,Buffer.from('\nendstream')]));
  }
  for(const [index,title] of [[3,'Evidence alpha: first page'],[5,'Evidence beta: second page']]) {
    const content=scanned?'q 300 0 0 300 80 300 cm /Im1 Do Q':`BT /F1 20 Tf 60 700 Td (${title}) Tj ET`;
    bodies[index]=`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  }
  const chunks=[Buffer.from('%PDF-1.7\n')],offsets=[0];let length=chunks[0].length;
  for(const [i,body] of bodies.entries()){
    offsets.push(length);const object=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),Buffer.isBuffer(body)?body:Buffer.from(body),Buffer.from('\nendobj\n')]);chunks.push(object);length+=object.length;
  }
  if(padding){const comment=Buffer.from('%'+ ' '.repeat(padding)+'\n');chunks.push(comment);length+=comment.length;}
  const xref=`xref\n0 ${bodies.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');
  chunks.push(Buffer.from(xref+`trailer\n<< /Size ${bodies.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
