/** Download a generated text file and release its temporary URL. */
export function downloadText(text: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Read supported source text without pretending to parse PDFs or images. */
export async function readSourceText(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('Choose a text file smaller than 2 MB.');
  if (!/\.(txt|md|csv)$/i.test(file.name)) throw new Error('Automatic PDF, Office and image extraction is not available. Paste extracted text or upload TXT, Markdown or CSV.');
  return file.text();
}
export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
