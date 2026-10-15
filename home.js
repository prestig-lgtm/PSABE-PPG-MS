/* Public read-only rendering for Supabase-backed homepage content. */
(async function () {
  const URL = 'https://dwzcyupoenjafgtdijla.supabase.co';
  const KEY = 'sb_publishable_s4VaYFDHxE3I9jgK2reWHw_zQ8VPVwd';
  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient(URL, KEY, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    const {data, error} = await client.from('homepage_content').select('content').eq('id','homepage').maybeSingle();
    if (error || !data?.content) return; // Existing static homepage remains as fallback.
    const c = data.content;
    const text = (selector, value) => { const el=document.querySelector(selector); if(el && typeof value==='string') el.textContent=value; };
    text('.hero .eyebrow', c.heroEyebrow);
    text('#heroTitle', c.heroTitle);
    text('#heroCopy', c.heroCopy);
    if (Array.isArray(window.psabeHomeSlides) && window.psabeHomeSlides[0]) { if(c.heroEyebrow) window.psabeHomeSlides[0].eyebrow=c.heroEyebrow; if(c.heroTitle) window.psabeHomeSlides[0].title=c.heroTitle; if(c.heroCopy) window.psabeHomeSlides[0].copy=c.heroCopy; }
    if (typeof window.psabeShowHomeSlide === 'function') window.psabeShowHomeSlide(0);
    const heroButton=document.querySelector('.hero-content .primary-button'); if(heroButton&&c.heroButton) heroButton.childNodes[0].textContent=c.heroButton+' ';
    text('.intro .section-heading .eyebrow', c.introEyebrow);
    text('.intro .section-heading h2', c.introTitle);
    text('.intro .section-heading > p:not(.eyebrow)', c.introCopy);
    const values=[['mission','Mission'],['vision','Vision'],['values','Values']];
    document.querySelectorAll('.values-grid .value-card').forEach((card,i)=>{const k=values[i]?.[0];if(!k)return;const title=card.querySelector('h3'),copy=card.querySelector('p');if(title&&c[k+'Title'])title.textContent=c[k+'Title'];if(copy&&c[k+'Copy'])copy.textContent=c[k+'Copy'];});
    document.querySelectorAll('.event-grid .event-card').forEach((card,i)=>{const n=i+1;const date=card.querySelector('.event-date b'),tag=card.querySelector('.tag'),title=card.querySelector('h3'),copy=card.querySelector('p');if(date&&c['event'+n+'Date'])date.textContent=c['event'+n+'Date'];if(tag&&c['event'+n+'Tag'])tag.textContent=c['event'+n+'Tag'];if(title&&c['event'+n+'Title'])title.textContent=c['event'+n+'Title'];if(copy&&c['event'+n+'Copy'])copy.textContent=c['event'+n+'Copy'];});
    document.querySelectorAll('.announcement-list article').forEach((card,i)=>{const n=i+1;const tag=card.querySelector('.tag'),title=card.querySelector('h3'),copy=card.querySelector('p'),label=card.querySelector('.announcement-label');if(tag&&c['announcement'+n+'Tag'])tag.textContent=c['announcement'+n+'Tag'];if(title&&c['announcement'+n+'Title'])title.textContent=c['announcement'+n+'Title'];if(copy&&c['announcement'+n+'Copy'])copy.textContent=c['announcement'+n+'Copy'];if(label&&c['announcement'+n+'Label'])label.textContent=c['announcement'+n+'Label'];});
    text('.achievement-band h2', c.achievementTitle);
    text('.achievement-band .achievement-inner > div:first-child > p:not(.eyebrow)', c.achievementCopy);
    text('.faculty-intro', c.facultyIntro);
    document.querySelectorAll('.faculty-grid .faculty-card').forEach((card,i)=>{const n=i+1;const avatar=card.querySelector('.faculty-avatar'),title=card.querySelector('h3'),copy=card.querySelector('p');if(avatar&&c['faculty'+n+'Initials'])avatar.textContent=c['faculty'+n+'Initials'];if(title&&c['faculty'+n+'Title'])title.textContent=c['faculty'+n+'Title'];if(copy&&c['faculty'+n+'Copy'])copy.textContent=c['faculty'+n+'Copy'];});
  } catch (err) { console.warn('Homepage content is using its built-in defaults.', err); }
})();
