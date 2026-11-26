const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Xác minh định dạng thật của file bằng những byte đầu tiên. */
export function matchesSignature(mimeType: string, head: Uint8Array): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]);
      
    case 'image/png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47]);
      
    case 'image/webp': // "RIFF" .... "WEBP"
      return startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8);
      
    case 'application/pdf':
      return startsWith(head, [0x25, 0x50, 0x44, 0x46]); // %PDF
      
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return startsWith(head, [0x50, 0x4b]); // PK (zip)
      
    case 'text/plain':
      return true;
      
    default:
      return false;
      
  }
}
