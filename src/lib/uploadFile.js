// Replaces base44.integrations.Core.UploadFile({ file }) — uploads to
// wl-dreamhome-api's R2-backed /api/upload endpoint (any authenticated role).
export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}

export default uploadFile;
