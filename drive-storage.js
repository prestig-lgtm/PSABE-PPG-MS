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

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        if (comma < 0) return reject(new Error('Could not encode the selected file.'));
        resolve(result.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    });

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
      url: isImage ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : (result.file.url || result.file.downloadUrl),
      viewUrl: result.file.url || `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`,
      downloadUrl: result.file.downloadUrl || `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
    };
  }

  window.psabeDriveStorage = Object.freeze({ upload, maxBytes: MAX_BYTES });
})();
