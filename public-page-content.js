/* Public renderer for Content Studio page sections (About Us and What ABE Is All About). */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://dwzcyupoenjafgtdijla.supabase.co';
  const KEY = 'sb_publishable_s4VaYFDHxE3I9jgK2reWHw_zQ8VPVwd';
  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const file = location.pathname.split('/').pop() || 'index.html';
  const map = { 'about.html': 'about', 'what-abe-is-all-about.html': 'what-abe-is-all-about' };
  const pageKey = map[file];
  if (!pageKey) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  const safeUrl = value => { try { const u = new window.URL(String(value || ''), location.href); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  function inline(text) {
    let out = esc(text);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    return out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/_(.+?)_/g, '<em>$1</em>');
  }
  function formatBody(value) {
    const lines = String(value ?? '').replace(/\r\n?/g, '\n').trim().split('\n'); let html = '', paragraph = [], list = [], listType = '';
    const p = () => { if (paragraph.length) { html += `<p>${paragraph.map(inline).join('<br>')}</p>`; paragraph = []; } };
    const l = () => { if (list.length) { html += `<${listType}>${list.map(item => `<li>${inline(item)}</li>`).join('')}</${listType}>`; list = []; listType = ''; } };
    lines.forEach(line0 => { const line = line0.trim(); if (!line) { p(); l(); return; } const h = line.match(/^(#{1,4})\s+(.+)$/); if (h) { p(); l(); const level = Math.min(4, h[1].length + 1); html += `<h${level}>${inline(h[2])}</h${level}>`; return; } const b = line.match(/^[-*•]\s+(.+)$/), n = line.match(/^\d+[.)]\s+(.+)$/); if (b || n) { p(); const kind = b ? 'ul' : 'ol'; if (list.length && listType !== kind) l(); listType = kind; list.push((b || n)[1]); return; } l(); paragraph.push(line); }); p(); l(); return html;
  }
  function styles() {
    if (document.getElementById('siteManagedRenderStyles')) return;
    const style = document.createElement('style'); style.id = 'siteManagedRenderStyles'; style.textContent = `
      .site-managed-content{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:clamp(30px,5vw,68px) 0;display:grid;gap:24px}
      .site-managed-block{min-width:0;padding:clamp(22px,3.5vw,38px);border:1px solid rgba(7,61,43,.12);border-radius:18px;background:#fff;box-shadow:0 12px 32px rgba(7,61,43,.055);overflow:hidden}
      .site-managed-block h2{display:block;margin:0 0 26px;padding-bottom:2px;color:#07543a;font-size:clamp(1.35rem,2.2vw,2rem);line-height:1.3}
      .site-managed-block>.managed-copy{margin-top:4px}
      .site-managed-block>.site-managed-image-gallery{margin-top:24px}
      .site-managed-block .managed-copy{color:#34443d;font-size:1rem;line-height:1.85;overflow-wrap:anywhere}
      .site-managed-block .managed-copy p{margin:0 0 1em}.site-managed-block .managed-copy p:last-child{margin-bottom:0}
      .site-managed-block .managed-copy ul,.site-managed-block .managed-copy ol{margin:.5em 0 1em;padding-left:1.5rem}.site-managed-block .managed-copy li{margin:.35em 0}
      .site-managed-block .managed-copy h3,.site-managed-block .managed-copy h4,.site-managed-block .managed-copy h5{color:#07543a;margin:1em 0 .45em}
      .site-managed-block .managed-copy a{color:#075c3e;text-decoration:underline}
      .site-managed-image-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:18px;margin-top:22px}
      .site-managed-image-figure{margin:0;min-width:0;overflow:hidden;border-radius:12px;background:#f3f7f4;border:1px solid rgba(7,61,43,.1)}
      .site-managed-image-figure img{display:block;width:100%;height:auto;max-height:440px;object-fit:cover}
      .site-managed-image-figure figcaption{padding:12px 14px;color:#34443d;font-size:.92rem;line-height:1.55;background:#f5f8f6}
      .site-managed-empty{width:min(1180px,calc(100% - 40px));margin:0 auto 40px;padding:22px;border:1px dashed #b9cfc0;border-radius:12px;background:#f7faf7;color:#526b5c;line-height:1.65}
      @media(max-width:640px){.site-managed-content{width:calc(100% - 28px);gap:16px;padding:28px 0}.site-managed-block{padding:20px 17px;border-radius:14px}.site-managed-image-gallery{grid-template-columns:1fr}}
    `; document.head.appendChild(style);
  }
  function render(data) {
    const main = document.querySelector('main'); if (!main) return;
    const banner = main.querySelector(':scope > .page-banner');
    const bannerContent = banner?.querySelector('.page-banner-content');
    if (data && bannerContent) {
      const eyebrow = bannerContent.querySelector('.eyebrow'); const title = bannerContent.querySelector('h1');
      const intro = bannerContent.querySelector(':scope > p:not(.eyebrow)');
      if (data.eyebrow && eyebrow) eyebrow.textContent = data.eyebrow;
      if (data.title && title) title.textContent = data.title;
      if (data.intro && intro) intro.textContent = data.intro;
    }
    Array.from(main.children).forEach(child => { if (child !== banner) child.remove(); });
    styles();
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    const section = document.createElement('section'); section.className = 'site-managed-content';
    blocks.forEach(block => {
      if (!block || !(block.title || block.body || block.text || block.image || (Array.isArray(block.images) && block.images.length))) return;
      const article = document.createElement('article'); article.className = 'site-managed-block';
      if (block.title) { const heading = document.createElement('h2'); heading.textContent = block.title; article.appendChild(heading); }
      if (block.body || block.text) { const copy = document.createElement('div'); copy.className = 'managed-copy'; copy.innerHTML = formatBody(block.body || block.text); article.appendChild(copy); }
      const images = Array.isArray(block.images) ? block.images : (block.image || block.image_url ? [{ url: block.image || block.image_url, caption: block.caption || '', alt: block.alt || block.image_alt || '' }] : []);
      if (images.length) {
        const gallery = document.createElement('div'); gallery.className = 'site-managed-image-gallery';
        images.forEach(item => { const url = safeUrl(item?.url || item?.image_url); if (!url) return; const figure = document.createElement('figure'); figure.className = 'site-managed-image-figure'; const image = document.createElement('img'); image.src = url; image.alt = item.alt || block.title || 'PSABE-PPG CSU Chapter image'; image.loading = 'lazy'; figure.appendChild(image); if (item.caption) { const caption = document.createElement('figcaption'); caption.textContent = item.caption; figure.appendChild(caption); } gallery.appendChild(figure); });
        if (gallery.children.length) article.appendChild(gallery);
      }
      const link = safeUrl(block.link); if (link) { const a = document.createElement('a'); a.href = link; a.textContent = block.link_label || 'Learn more'; a.target = '_blank'; a.rel = 'noopener noreferrer'; article.appendChild(a); }
      section.appendChild(article);
    });
    if (section.children.length) main.appendChild(section);
    else { const empty = document.createElement('p'); empty.className = 'site-managed-empty'; empty.textContent = 'This page has no published content yet. Add and save sections in Content Studio to display them here.'; main.appendChild(empty); }
  }
  (async () => {
    try {
      const { data, error } = await client.from('site_page_content').select('title,eyebrow,intro,blocks').eq('page_key', pageKey).maybeSingle();
      if (error) throw error;
      render(data);
    } catch (error) {
      console.error('Could not load editable page content.', error);
      render(null);
    }
  })();
})();
