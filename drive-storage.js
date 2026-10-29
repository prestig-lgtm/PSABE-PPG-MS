/* PSABE-PPG Google Drive storage bridge.
 * Public files are uploaded through the authenticated Apps Script endpoint.
 * Supabase remains responsible for content records, captions, and auth.
 */
(function () {
  'use strict';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwotJFJiUuHHrG_xoxkHgbPNnd9BopXO55oE8xHRd0Out6xx48X965VPOsK4a4FNC_O8w/exec';
  const MAX_BYTES = 5 * 1024 * 1024;

  async function upload(file, visibility) {
    if (!(file instanceof File)) throw new Error('Choose a file to upload.');
    if (file.size > MAX_BYTES) throw new Error('The current Google Drive upload endpoint limit is 5 MB per file.');
    if (file.size <= 0) throw new Error('The selected file is empty.');

    const client = window.psabeSupabase;
    if (!client) throw new Error('Supabase connection is unavailable. Refresh the dashboard.');
    const { data, error } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (error || !token) throw new Error('Your session has expired. Please sign in again.');

    // Encode the original bytes directly. No resizing, recompression, or image
    // transformation occurs here; the exact file bytes are sent to Drive.
    // Chunking avoids spreading a large byte array into a single String.fromCharCode call.
    const base64 = await (async () => {
      let buffer;
      try { buffer = await file.arrayBuffer(); }
      catch (_) { throw new Error('Could not read the selected file.'); }
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      const binaryChunks = [];
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binaryChunks.push(String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))));
      }
      // Join once instead of repeatedly rebuilding a growing string.
      try { return btoa(binaryChunks.join('')); }
      catch (_) { throw new Error('Could not encode the selected file.'); }
    })();

    const payload = {
      action: 'upload',
      accessToken: token,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64,
      visibility: visibility || 'public'
    };

    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
    } catch (err) {
      throw new Error('Could not reach Google Drive storage. Check your connection and try again. If this repeats, verify the Apps Script deployment.');
    }

    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error('Google Drive returned an unreadable response. No upload success was confirmed.'); }
    if (!response.ok || !result?.success || !result?.file?.id) {
      throw new Error(result?.error || 'Google Drive upload failed.');
    }

    const id = result.file.id;
    const isImage = (file.type || '').startsWith('image/');
    return {
      id,
      name: result.file.name || file.name,
      mimeType: result.file.mimeType || file.type || 'application/octet-stream',
      size: result.file.size || file.size,
      // Direct view URL is suitable for public image src attributes.
      url: isImage ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : (result.file.url || result.file.downloadUrl),
      viewUrl: result.file.url || `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`,
      downloadUrl: result.file.downloadUrl || `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
    };
  }

  window.psabeDriveStorage = Object.freeze({ upload, maxBytes: MAX_BYTES });
})();
