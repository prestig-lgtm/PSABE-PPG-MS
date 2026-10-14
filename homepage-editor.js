/* PSABE-PPG homepage editor. Uses the dashboard's authenticated Supabase client. */
(function () {
  'use strict';
  const TABLE = 'homepage_content';
  const ROW_ID = 'homepage';
  const form = document.getElementById('homepageContentForm');
  if (!form) return;
  const statusEl = document.getElementById('homepageEditorStatus');
  const saveButton = document.getElementById('homepageSaveButton');
  const reloadButton = document.getElementById('homepageReloadButton');
  let loadedContent = null;

  const fields = [
    'heroEyebrow','heroTitle','heroCopy','heroButton','introEyebrow','introTitle','introCopy',
    'missionTitle','missionCopy','visionTitle','visionCopy','valuesTitle','valuesCopy',
    ...[1,2,3].flatMap(i=>[`event${i}Date`,`event${i}Tag`,`event${i}Title`,`event${i}Copy`]),
    ...[1,2,3].flatMap(i=>[`announcement${i}Tag`,`announcement${i}Title`,`announcement${i}Copy`,`announcement${i}Label`]),
    'achievementTitle','achievementCopy','facultyIntro',
    ...[1,2,3].flatMap(i=>[`faculty${i}Initials`,`faculty${i}Title`,`faculty${i}Copy`])
  ];
  const defaults = {
    heroEyebrow:'INNOVATION · SUSTAINABILITY · COMMUNITY',heroTitle:'GROWING TOMORROW, TOGETHER.',heroCopy:'Empowering future agricultural and biosystems engineers through leadership, innovation, and service to our communities.',heroButton:'Discover Our Chapter',
    introEyebrow:'WHO WE ARE',introTitle:'Engineering a Better Tomorrow.',introCopy:'A community of aspiring agricultural and biosystems engineers committed to learning, leadership, and sustainable development.',
    missionTitle:'Our Mission',missionCopy:'To develop competent, service-oriented future professionals through learning, collaboration, and meaningful community engagement.',visionTitle:'Our Vision',visionCopy:'A proactive student organization contributing to sustainable agriculture and resilient communities.',valuesTitle:'Our Values',valuesCopy:'Excellence, integrity, innovation, teamwork, and service.',
    event1Date:'01',event1Tag:'CHAPTER ACTIVITY',event1Title:'Chapter Events',event1Copy:'Watch this space for upcoming chapter activities and gatherings.',event2Date:'02',event2Tag:'LEARNING',event2Title:'Learning & Development',event2Copy:'Opportunities to learn, share knowledge, and grow together.',event3Date:'03',event3Tag:'COMMUNITY',event3Title:'Community Engagement',event3Copy:'Activities that connect engineering knowledge with community needs.',
    announcement1Tag:'CHAPTER UPDATE',announcement1Title:'Official announcements will appear here',announcement1Copy:'Check back for updates from PSABE-PPG CSU Chapter.',announcement1Label:'UPDATE',announcement2Tag:'MEMBERS',announcement2Title:'Stay connected with the organization',announcement2Copy:'Important reminders and member information will be shared in this section.',announcement2Label:'NOTICE',announcement3Tag:'OPPORTUNITIES',announcement3Title:'Activities and opportunities',announcement3Copy:'Look here for future learning, leadership, and service opportunities.',announcement3Label:'INFO',
    achievementTitle:'Building skills. Creating impact.',achievementCopy:'Celebrating the people, projects, and shared efforts that move our chapter forward.',facultyIntro:'Meet the faculty members who support and guide the development of future agricultural and biosystems engineers.',faculty1Initials:'PS',faculty1Title:'Faculty Adviser',faculty1Copy:'Faculty adviser information will be added here.',faculty2Initials:'FC',faculty2Title:'Faculty Members',faculty2Copy:'Faculty profiles and details will be added here.',faculty3Initials:'ABE',faculty3Title:'ABE Faculty',faculty3Copy:'Academic guidance for aspiring agricultural and biosystems engineers.'
  };

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', !!isError);
  }
  function getClient() { return window.psabeSupabase || null; }
  async function ensureOfficer() {
    const client = getClient();
    if (!client) throw new Error('The authenticated Supabase client is not available. Refresh the dashboard and try again.');
    const { data: sessionResult, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionResult?.session?.user) throw new Error('Please sign in again to edit homepage content.');
    const user = sessionResult.session.user;
    const { data: officer, error } = await client.from('officers').select('auth_user_id,status').eq('auth_user_id', user.id).single();
    if (error || !officer || (officer.status && String(officer.status).toLowerCase() !== 'active')) throw new Error('Only active officers with Management System accounts can edit the homepage.');
    return {client, user};
  }
  function fillForm(content) {
    const merged = {...defaults, ...(content || {})};
    fields.forEach(key => { const el = form.elements.namedItem(key); if (el) el.value = merged[key] == null ? '' : String(merged[key]); });
  }
  async function loadContent() {
    setStatus('Loading content…');
    if (saveButton) saveButton.disabled = true;
    try {
      const {client} = await ensureOfficer();
      const {data, error} = await client.from(TABLE).select('content,updated_at').eq('id', ROW_ID).maybeSingle();
      if (error) throw error;
      loadedContent = data?.content || defaults;
      fillForm(loadedContent);
      setStatus(data?.updated_at ? `Loaded saved content · ${new Date(data.updated_at).toLocaleString()}` : 'No saved changes yet · showing current homepage defaults');
    } catch (err) {
      console.error('Homepage content load failed:', err);
      fillForm(loadedContent || defaults);
      setStatus(err.message || 'Unable to load homepage content. Check the Supabase setup.', true);
    } finally { if (saveButton) saveButton.disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (saveButton) saveButton.disabled = true;
    setStatus('Saving changes…');
    try {
      const {client, user} = await ensureOfficer();
      const content = {};
      fields.forEach(key => { const el = form.elements.namedItem(key); content[key] = String(el.value || '').trim(); });
      const {error} = await client.from(TABLE).upsert({id: ROW_ID, content, updated_by: user.id, updated_at: new Date().toISOString()}, {onConflict:'id'});
      if (error) throw error;
      loadedContent = content;
      setStatus('Saved and published. The public homepage will display these changes on its next load.');
    } catch (err) {
      console.error('Homepage content save failed:', err);
      setStatus(err.message || 'Could not save changes. Check the Supabase table and RLS policies.', true);
    } finally { if (saveButton) saveButton.disabled = false; }
  });
  if (reloadButton) reloadButton.addEventListener('click', loadContent);
  window.loadHomepageEditor = loadContent;
  // Populate form on dashboard load without affecting the existing dashboard modules.
  loadContent();
})();
