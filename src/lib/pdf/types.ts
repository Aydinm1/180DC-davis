export type PdfResource = { kind: 'submission' | 'example'; id: string; name: string };
export function isPdfFile(mime: string | null | undefined, name: string) {
 return mime === 'application/pdf' || !mime && /\.pdf$/i.test(name);
}
export function pdfUrls(resource: PdfResource) {
 const base=resource.kind==='submission'?'/api/submissions/':'/api/grading-examples/';
 return {preview:`${base}${resource.id}/pdf`,download:`${base}${resource.id}/download`};
}
export function pdfSignature(bytes:Uint8Array) {
 return /^%PDF-(?:1\.[0-7]|2\.0)/.test(String.fromCharCode(...bytes.subarray(0,8)));
}
