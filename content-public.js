/* Public Content Studio renderer.
   Published Supabase entries replace page placeholder/sample content instead of being appended to it.
   Existing database columns and authentication are unchanged. */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://dwzcyupoenjafgtdijla.supabase.co';
  const KEY = 'sb_publishable_s4VaYFDHxE3I9jgK2reWHw_zQ8VPVwd';
  if (!window.supabase?.createClient) return;
  const db = window.supabase.createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const file = location.pathname.split('/').pop() || 'index.html';
  const pageTypes = {
    'officers.html': 'officers', 'faculty.html': 'faculty', 'research.html': 'research',
    'gallery.html': 'gallery', 'memorandums.html': 'memorandums', 'resources.html': 'resources',
    'events.html': 'events', 'announcements.html': 'announcements', 'achievements.html': 'achievements'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const safeUrl = value => {
    try { const u = new window.URL(String(value || ''), location.href); return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) ? u.href : ''; }
    catch (_) { return ''; }
  };
  function inline(text) {
    let out = esc(text);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
    out = out.replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/_(.+?)_/g, '<em>$1</em>');
    return out;
  }
  function formatBody(value) {
    const raw = String(value ?? '').replace(/\r\n?/g, '\n').trim();
    if (!raw) return '';
    const lines = raw.split('\n'); let html = '', paragraph = [], list = [], listType = '';
    const flushP = () => { if (paragraph.length) { html += `<p>${paragraph.map(inline).join('<br>')}</p>`; paragraph = []; } };
    const flushList = () => { if (list.length) { html += `<${listType}>${list.map(x => `<li>${inline(x)}</li>`).join('')}</${listType}>`; list = []; listType = ''; } };
    for (const source of lines) {
      const line = source.trim();
      if (!line) { flushP(); flushList(); continue; }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) { flushP(); flushList(); const level = Math.min(4, heading[1].length + 1); html += `<h${level}>${inline(heading[2])}</h${level}>`; continue; }
      const bullet = line.match(/^[-*•]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (bullet || numbered) { flushP(); const kind = bullet ? 'ul' : 'ol'; if (list.length && listType !== kind) flushList(); listType = kind; list.push((bullet || numbered)[1]); continue; }
      flushList(); paragraph.push(line);
    }
    flushP(); flushList();
    return html;
  }
  function addStyles() {
    if (document.getElementById('cmsPublicStyles')) return;
    const style = document.createElement('style'); style.id = 'cmsPublicStyles';
    style.textContent = `
      .cms-public-section{max-width:1240px;margin:0 auto;padding:clamp(30px,5vw,64px) 22px;box-sizing:border-box}
      .cms-public-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:22px;align-items:stretch}.cms-public-grid.cms-grid-announcements,.cms-public-grid.cms-grid-officers,.cms-public-grid.cms-grid-faculty{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
      .cms-public-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;background:#fff;border:1px solid #7db68a;border-radius:7px;box-shadow:0 3px 12px #073d2b0b;color:#173e30;transition:box-shadow .18s ease,transform .18s ease}.cms-public-card:hover{box-shadow:0 8px 22px #073d2b16;transform:translateY(-2px)}
      .cms-public-card>img{display:block;width:calc(100% - 16px);height:224px;margin:8px 8px 0;object-fit:cover;background:#e9f1eb;border-radius:6px}.cms-public-card .cms-card-category{display:inline-flex;align-items:center;gap:7px;margin:0 0 12px;padding:3px 8px 3px 0;background:#f1f4ef;color:#244b32;font-size:.78rem;font-weight:700;line-height:1.35}.cms-public-card .cms-card-category:before{content:'';display:block;width:3px;height:17px;background:#e2b900}.cms-public-card .cms-card-byline{display:flex;flex-wrap:wrap;gap:5px 12px;margin:7px 0 12px;color:#89918d;font-size:.78rem}.cms-public-card .cms-card-byline span{display:inline-flex;align-items:center;gap:4px}.cms-public-card .cms-card-excerpt{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .cms-public-card-body{display:flex;flex:1;flex-direction:column;align-items:flex-start;padding:12px 15px 18px;min-width:0}
      .cms-public-card h2,.cms-public-card h3{margin:0 0 8px;color:#171f1a;font-size:1.02rem;font-weight:750;line-height:1.4;overflow-wrap:anywhere}
      .cms-public-card p{line-height:1.75;color:#405b4d;margin:8px 0;overflow-wrap:anywhere}
      .cms-public-card .cms-body p{margin:0 0 12px}.cms-public-card .cms-body p:last-child{margin-bottom:0}
      .cms-public-card .cms-body h3,.cms-public-card .cms-body h4,.cms-public-card .cms-body h5{margin:16px 0 7px;color:#07523a}
      .cms-public-card .cms-body ul,.cms-public-card .cms-body ol{padding-left:1.4rem;margin:8px 0 14px;color:#405b4d;line-height:1.7}
      .cms-public-card .cms-body a{color:#075c3e;text-decoration:underline;overflow-wrap:anywhere}
      .cms-public-meta{font-size:.9rem;color:#537864;margin:3px 0}
      .cms-public-link{display:inline-flex;margin-top:auto;padding:10px 14px;border-radius:8px;background:#07523a;color:#fff!important;text-decoration:none!important;font-weight:700;align-self:flex-start}
      .cms-public-empty{padding:24px;border:1px dashed #b9cfc0;border-radius:12px;background:#f7faf7;color:#526b5c;line-height:1.65}
      .cms-public-caption{display:block;margin-top:8px;color:#536a5c;font-size:.9rem;line-height:1.5}
      .cms-public-section .cms-section-heading{margin:0 0 22px;color:#104b37;font-size:clamp(1.5rem,3vw,2.25rem)}
      .cms-public-section .cms-section-intro{max-width:850px;margin:-10px 0 24px;color:#526b5c;line-height:1.75}
      .cms-home-feed .cms-public-grid{margin-top:18px}.cms-home-feed .cms-public-card>img{height:210px}.cms-announcements-card,.cms-officers-card,.cms-faculty-card{border-radius:7px}.cms-announcements-card .cms-card-excerpt{-webkit-line-clamp:3}.cms-announcements-card .cms-card-excerpt p{margin:0 0 8px}.cms-officers-card .cms-public-card-body,.cms-faculty-card .cms-public-card-body{padding:16px 17px 20px}.cms-officers-card .cms-public-meta,.cms-faculty-card .cms-public-meta{font-size:.88rem;color:#52695b}.cms-officers-card>img{width:calc(100% - 16px);height:auto;max-height:none;aspect-ratio:auto;object-fit:contain;object-position:center;margin:8px auto 0;box-sizing:border-box;display:block}.cms-faculty-card>img{height:260px;object-fit:cover;object-position:center top}.cms-officers-card h3,.cms-faculty-card h3{font-size:1.08rem}.cms-officers-group{margin:0 0 34px}.cms-officers-group:last-child{margin-bottom:0}.cms-officers-group-title{display:flex;align-items:center;gap:12px;margin:0 0 18px;color:#104b37;font-size:clamp(1.15rem,2vw,1.55rem);font-weight:800}.cms-officers-group-title:before{content:'';width:5px;height:27px;background:#d9b95c;border-radius:3px}.cms-officers-group .cms-public-grid{margin:0}.cms-officers-card .cms-card-category{background:#f7f5e9;color:#315a3f}.cms-officers-card .cms-card-byline{display:none}.cms-faculty-card .cms-card-category{background:#eef5ef;color:#315a3f}.cms-faculty-card .cms-card-byline{display:none}.cms-faculty-card .cms-public-card>img{object-fit:cover}
      .cms-hero-cms{position:relative;isolation:isolate;min-height:clamp(430px,58vw,650px);display:flex;align-items:flex-end;background:#073d2b center/cover no-repeat;color:white;padding:70px max(7vw,24px) 50px;box-sizing:border-box;overflow:hidden}
      .cms-hero-cms:before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(2,35,24,.88),rgba(2,35,24,.50) 58%,rgba(2,35,24,.12))}
      .cms-hero-cms .cms-hero-copy{max-width:780px}.cms-hero-cms .eyebrow{color:#e4c66b;letter-spacing:.14em;text-transform:uppercase;font-size:.78rem;font-weight:700}
      .cms-hero-cms h1{font-size:clamp(2.2rem,5.2vw,4.6rem);line-height:1.04;margin:14px 0;color:#fff;max-width:850px}
      .cms-hero-cms .cms-hero-body{font-size:clamp(1rem,1.6vw,1.2rem);line-height:1.75;max-width:680px;color:#f2f6f2;white-space:pre-line}
      .cms-hero-cms .cms-hero-cta{display:inline-flex;margin-top:12px;padding:12px 18px;border-radius:8px;background:#d9b95c;color:#153e2d;font-weight:800;text-decoration:none}.cms-hero-cms .cms-hero-cta[hidden]{display:none!important}
      .cms-hero-dots{position:absolute;z-index:2;bottom:22px;left:50%;transform:translateX(-50%);display:flex;gap:10px}
      .cms-hero-dots button{width:11px;height:11px;border:1px solid #fff;border-radius:50%;background:#ffffff80;padding:0;cursor:pointer}.cms-hero-dots button.active{background:#e2c263;transform:scale(1.2)}
      .cms-hero-arrow{position:absolute;z-index:2;top:50%;transform:translateY(-50%);width:42px;height:42px;border:1px solid #ffffff80;border-radius:50%;background:#073d2b99;color:#fff;font-size:27px;cursor:pointer}.cms-hero-arrow.prev{left:18px}.cms-hero-arrow.next{right:18px}
      .cms-gallery-card figure{margin:0}.cms-gallery-card figure img{display:block;width:100%;height:250px;object-fit:cover}.cms-gallery-card figcaption{padding:10px 20px 0;color:#536a5c;font-size:.9rem;line-height:1.55}
      @media(max-width:900px){.cms-public-grid.cms-grid-announcements,.cms-public-grid.cms-grid-officers,.cms-public-grid.cms-grid-faculty{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.cms-public-section{padding:28px 16px}.cms-public-grid,.cms-public-grid.cms-grid-announcements,.cms-public-grid.cms-grid-officers,.cms-public-grid.cms-grid-faculty{grid-template-columns:1fr;gap:15px}.cms-public-card>img{height:220px}.cms-officers-card>img{width:calc(100% - 16px);height:auto;max-height:none;aspect-ratio:auto;object-fit:contain;object-position:center;margin:8px auto 0;box-sizing:border-box}.cms-faculty-card>img{height:260px}.cms-hero-cms{min-height:390px;align-items:flex-end;padding:48px 25px 42px}.cms-hero-arrow{width:34px;height:34px;font-size:22px}.cms-hero-arrow.prev{left:8px}.cms-hero-arrow.next{right:8px}}
    `;
    document.head.appendChild(style);
  }
  function card(row, type) {
    const title = row.person_name || row.title || 'PSABE-PPG CSU Chapter';
    const imageUrl = safeUrl(row.image_url);
    const fileUrl = safeUrl(row.file_url);
    const image = imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(row.image_alt || title)}" loading="lazy">${type === 'gallery' && row.subtitle ? `<span class="cms-public-caption">${esc(row.subtitle)}</span>` : ''}` : '';
    const meta = [row.position, row.committee, row.course].filter(Boolean).map(v => `<div class="cms-public-meta">${esc(v)}</div>`).join('');
    const rawDate = row.event_date || row.published_at || row.created_at;
    const displayDate = rawDate ? (Number.isNaN(new Date(rawDate).getTime()) ? String(rawDate) : new Date(rawDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })) : '';
    const category = row.category || row.subtitle || ({announcements:'Announcement', officers:(row.position || 'Chapter Officer'), faculty:(row.position || 'Faculty Member')}[type] || 'PSABE-PPG CSU Chapter');
    const byline = (displayDate || row.author || row.created_by_name) ? `<div class="cms-card-byline">${row.author || row.created_by_name ? `<span>♟ ${esc(row.author || row.created_by_name)}</span>` : ''}${displayDate ? `<span>▦ ${esc(displayDate)}</span>` : ''}</div>` : '';
    const date = row.event_date && type === 'events' ? `<div class="cms-public-meta">${esc(displayDate)}${row.location ? ` · ${esc(row.location)}` : ''}</div>` : '';
    const contacts = ['officers','faculty'].includes(type) && (row.email || row.phone || row.social_url)
      ? `<p>${row.email ? `<a href="mailto:${esc(row.email)}">Email</a> ` : ''}${row.phone ? `<a href="tel:${esc(row.phone)}">${esc(row.phone)}</a> ` : ''}${safeUrl(row.social_url) ? `<a href="${esc(safeUrl(row.social_url))}" target="_blank" rel="noopener noreferrer">More information</a>` : ''}</p>` : '';
    const fileLink = fileUrl ? `<a class="cms-public-link" href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer">${esc(row.file_name || (type === 'memorandums' ? 'View memorandum' : 'View / Download file'))}</a>` : '';
    const categoryLabel = type === 'announcements' ? `<span class="cms-card-category">${esc(category)}</span>` : (['officers','faculty'].includes(type) ? `<span class="cms-card-category">${esc(category)}</span>` : '');
    const bodyClass = ['announcements'].includes(type) ? 'cms-body cms-card-excerpt' : 'cms-body';
    return `<article class="cms-public-card ${type === 'gallery' ? 'cms-gallery-card' : ''} ${['announcements','officers','faculty'].includes(type) ? `cms-${type}-card` : ''}">${image}<div class="cms-public-card-body">${categoryLabel}<h3>${esc(title)}</h3>${byline}${meta}${row.subtitle && !['announcements','officers','faculty','gallery'].includes(type) ? `<p><strong>${esc(row.subtitle)}</strong></p>` : ''}${row.body ? `<div class="${bodyClass}">${formatBody(row.body)}</div>` : ''}${date}${contacts}${fileLink}</div></article>`;
  }
  function renderGrid(rows, target, type, emptyText) {
    if (!target) return;
    addStyles();
    target.innerHTML = rows.length ? `<div class="cms-public-grid cms-grid-${esc(type)}">${rows.map(row => card(row, type)).join('')}</div>` : `<p class="cms-public-empty">${esc(emptyText || 'No published content is available yet.')}</p>`;
  }
  function renderEmptyHero() {
    const hero = document.querySelector('.hero'); if (!hero) return;
    addStyles(); hero.classList.add('cms-hero-cms');
    hero.innerHTML = '<div class="cms-hero-copy"><p class="eyebrow">PSABE-PPG CSU CHAPTER</p><h1>Welcome</h1><p class="cms-hero-body">Published homepage slides will appear here when added through Content Studio.</p></div>';
  }
  function renderCarousel(rows) {
    const hero = document.querySelector('.hero');
    if (!hero || !rows.length) return;
    addStyles(); let index = 0, timer = null;
    hero.classList.add('cms-hero-cms');
    hero.innerHTML = `<div class="cms-hero-copy"><p class="eyebrow" id="cmsHeroEyebrow"></p><h1 id="cmsHeroTitle"></h1><p class="cms-hero-body" id="cmsHeroBody"></p><a class="cms-hero-cta" id="cmsHeroLink" hidden></a></div><button class="cms-hero-arrow prev" type="button" aria-label="Previous slide">‹</button><button class="cms-hero-arrow next" type="button" aria-label="Next slide">›</button><div class="cms-hero-dots" aria-label="Choose hero slide"></div>`;
    const dots = hero.querySelector('.cms-hero-dots');
    dots.innerHTML = rows.map((_, i) => `<button type="button" data-slide="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('');
    function paint(next) {
      index = (next + rows.length) % rows.length; const row = rows[index];
      const imageUrl = safeUrl(row.image_url);
      hero.style.backgroundImage = imageUrl ? `url("${imageUrl.replace(/"/g, '%22')}")` : '';
      hero.querySelector('#cmsHeroEyebrow').textContent = row.subtitle || 'PSABE-PPG CSU CHAPTER';
      hero.querySelector('#cmsHeroTitle').textContent = row.title || '';
      hero.querySelector('#cmsHeroBody').textContent = row.body || '';
      const link = hero.querySelector('#cmsHeroLink'), href = safeUrl(row.social_url);
      if (href) { link.href = href; link.textContent = row.file_name || 'Learn more'; link.hidden = false; }
      else { link.hidden = true; link.removeAttribute('href'); }
      dots.querySelectorAll('button').forEach((button, i) => { button.classList.toggle('active', i === index); button.setAttribute('aria-pressed', String(i === index)); });
    }
    hero.querySelector('.prev').addEventListener('click', () => paint(index - 1));
    hero.querySelector('.next').addEventListener('click', () => paint(index + 1));
    dots.addEventListener('click', event => { const button = event.target.closest('[data-slide]'); if (button) paint(Number(button.dataset.slide)); });
    paint(0);
    if (rows.length > 1) { timer = setInterval(() => paint(index + 1), 6500); hero.addEventListener('mouseenter', () => clearInterval(timer)); hero.addEventListener('mouseleave', () => { clearInterval(timer); timer = setInterval(() => paint(index + 1), 6500); }); }
  }
  async function fetchType(type) {
    const { data, error } = await db.from('site_content_items').select('*').eq('content_type', type).eq('status', 'published').order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  function replacePageContent(main, rows, type) {
    if (!main) return;
    // Ensure the Content Studio card/grid template styles are present on every
    // content-driven public page, not only when renderGrid() is used on Home.
    addStyles();
    const banner = main.querySelector(':scope > .page-banner');
    Array.from(main.children).forEach(child => { if (child !== banner) child.remove(); });
    const section = document.createElement('section'); section.className = 'cms-public-section';
    if (rows.length) {
      const heading = document.createElement('h2'); heading.className = 'cms-section-heading';
      heading.textContent = ({officers:'Chapter Officers',faculty:'Faculty & Advisers',research:'Research & Innovation',gallery:'Chapter Gallery',memorandums:'Memorandums & Official Notices',resources:'Resources & Downloads',events:'Events',announcements:'Announcements',achievements:'Achievements'})[type] || 'Published Content';
      section.appendChild(heading);
      if (type === 'events') {
        const today = new Date(); const upcoming = rows.filter(row => !row.event_date || new Date(row.event_date + 'T23:59:59') >= today);
        if (upcoming.length) section.insertAdjacentHTML('beforeend', `<div class="cms-public-grid cms-grid-${esc(type)}">${upcoming.map(row => card(row, type)).join('')}</div>`);
        else section.innerHTML += '<p class="cms-public-empty">There are no upcoming events at this time.</p>';
      } else if (type === 'officers') {
        // Group officers using existing published role/committee data only; do not invent officer details.
        const groups = new Map();
        rows.forEach(row => {
          const groupName = String(row.category || row.committee || 'Chapter Officers').trim() || 'Chapter Officers';
          if (!groups.has(groupName)) groups.set(groupName, []);
          groups.get(groupName).push(row);
        });
        section.insertAdjacentHTML('beforeend', Array.from(groups, ([name, items]) => `<div class="cms-officers-group"><h3 class="cms-officers-group-title">${esc(name)}</h3><div class="cms-public-grid cms-grid-officers">${items.map(row => card(row, type)).join('')}</div></div>`).join(''));
      } else if (type === 'faculty') {
        section.insertAdjacentHTML('beforeend', `<p class="cms-section-intro">Meet the faculty and advisers supporting agricultural and biosystems engineering at Caraga State University.</p><div class="cms-public-grid cms-grid-faculty">${rows.map(row => card(row, type)).join('')}</div>`);
      } else section.insertAdjacentHTML('beforeend', `<div class="cms-public-grid cms-grid-${esc(type)}">${rows.map(row => card(row, type)).join('')}</div>`);
    } else {
      section.innerHTML = `<p class="cms-public-empty">No ${esc(type)} have been published yet. Published entries added through Content Studio will appear here.</p>`;
    }
    main.appendChild(section);
  }
  async function run() {
    // Clear the static/demo hero immediately, before the network request completes.
    // This prevents old hardcoded slide text from flashing while published entries load.
    const isHomePage = file === 'home.html' || file === 'index.html';
    if (isHomePage) renderEmptyHero();
    try {
      if (isHomePage) {
        const [slides, achievements, announcements, events] = await Promise.all(['carousel','achievements','announcements','events'].map(fetchType));
        if (slides.length) renderCarousel(slides); else renderEmptyHero();
        renderGrid(achievements.slice(0, 3), document.getElementById('homeAchievementEntries'), 'achievements', 'No achievements have been published yet.');
        renderGrid(announcements.slice(0, 3), document.getElementById('homeAnnouncementEntries'), 'announcements', 'No announcements have been published yet.');
        const upcoming = events.filter(row => !row.event_date || new Date(row.event_date + 'T23:59:59') >= new Date());
        renderGrid(upcoming.slice(0, 3), document.getElementById('homeEventEntries'), 'events', 'No upcoming events have been published yet.');
        return;
      }
      const type = pageTypes[file];
      if (!type) return;
      const rows = await fetchType(type);
      replacePageContent(document.querySelector('main'), rows, type);
    } catch (error) {
      console.error('Could not load published Content Studio entries.', error);
      if (file === 'home.html' || file === 'index.html') { renderEmptyHero(); return; }
      const type = pageTypes[file];
      if (type) replacePageContent(document.querySelector('main'), [], type);
    }
  }
  run();
})();
