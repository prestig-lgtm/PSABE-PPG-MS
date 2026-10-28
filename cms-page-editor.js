/* Page editor embedded in Content Studio. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const root=$('cmsPageSelect'); if(!root)return;
const db=()=>window.psabeSupabase||null;
const sections={about:[],'what-abe-is-all-about':[]};
let current={blocks:[]};
function status(t,bad=false){const e=$('cmsPageStatus');e.textContent=t;e.classList.toggle('is-error',bad)}
function renderBlocks(blocks){
 const data=Array.isArray(blocks)?blocks:[];
 $('cmsPageBlocks').innerHTML=data.map((block,i)=>`<div class="cms-page-block-field"><h4>Section ${i+1}</h4><label>Section heading<input data-block-title="${i}" value="${esc(block?.title||'')}" placeholder="Enter your own section heading"></label><label>Content<textarea data-block-body="${i}" rows="4" placeholder="Write your section content">${esc(block?.body||block?.text||'')}</textarea></label></div>`).join('')||'<p>No preset sections. Add your own content using the page editor.</p>';
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function auth(){
 const c=db();if(!c)throw Error('Supabase connection is unavailable. Refresh the dashboard.');
 const {data,error}=await c.auth.getSession();if(error||!data.session?.user)throw Error('Please sign in again.');
 return {c,u:data.session.user};
}
async function load(){
 status('Loading page…');
 try{
  const {c}=await auth();
  const {data,error}=await c.from('site_page_content').select('*').eq('page_key',root.value).maybeSingle();
  if(error)throw error;
  current=data||{page_key:root.value,title:root.value==='about'?'About Us':'What ABE Is All About',eyebrow:'',intro:'',blocks:[]};
  $('cmsPageTitle').value=current.title||'';
  $('cmsPageEyebrow').value=current.eyebrow||'';
  $('cmsPageIntro').value=current.intro||'';
  renderBlocks(current.blocks);
  status('Page loaded. Make your changes and select Save page.');
 }catch(e){status((e.message||'Unable to load page.')+(/site_page_content|schema cache|does not exist/i.test(e.message||'')?' Run the updated homepage_content_setup.sql in Supabase SQL Editor, then refresh.':''),true)}
}
async function save(){
 status('Saving page…');
 try{
  const {c,u}=await auth();
  const blocks=Array.from($('cmsPageBlocks').querySelectorAll('[data-block-title]')).map((el)=>{const i=el.dataset.blockTitle;return {title:el.value.trim(),body:$(`[data-block-body="${i}"]`).value.trim()}}).filter(block=>block.title||block.body);
  const row={page_key:root.value,title:$('cmsPageTitle').value.trim(),eyebrow:$('cmsPageEyebrow').value.trim(),intro:$('cmsPageIntro').value.trim(),blocks,updated_by:u.id,updated_at:new Date().toISOString()};
  const {error}=await c.from('site_page_content').upsert(row,{onConflict:'page_key'});if(error)throw error;
  current=row;status('Page saved successfully.');
 }catch(e){status(e.message||'Unable to save page.',true)}
}
root.addEventListener('change',load);
$('cmsPageReload').addEventListener('click',load);
$('cmsPageSave').addEventListener('click',save);
load();
})();
