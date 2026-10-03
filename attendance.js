/* =========================================================
   PSABE-PPG ATTENDANCE MODULE
   Supabase = primary attendance database
   Google Sheets = backup only
========================================================= */
(function(){
"use strict";

const supabase = window.psabeSupabase;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyPWMqQzXUI50IiaMPOc8SK3mYl6vF8jF5Yg-4pstArZ_oVfuBAoJHwgvv65OT3hggCvQ/exec";
const CURRENT_USERNAME = sessionStorage.getItem("psabeUsername") || "Mac";
let events=[];
let activeEvent=null;
let records=[];
let recordMode="TIME IN";
let qr=null;
let qrRunning=false;
let qrStarting=false;
let pendingStudentId="";
let pendingSource="";
let pendingSex="";
let qrLibraryPromise=null;

function el(id){return document.getElementById(id)}
function esc(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML}
function now(){return new Date().toISOString()}
function id(prefix){return prefix+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase()}
function dateLabel(v){if(!v)return"—";const d=new Date(String(v).includes("T")?v:v+"T00:00:00");return isNaN(d)?String(v):d.toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"})}
function timeLabel(v){if(!v)return"—";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",second:"2-digit"})}
function badgeClass(v){v=String(v||"").toUpperCase();return v==="COMPLETE"?"complete":v==="LATE"?"late":v==="PENDING"?"pending":"present"}

function buildModals(){
 if(el("attendanceEventModal"))return;
 document.body.insertAdjacentHTML("beforeend",`
 <div id="attendanceEventModal" class="attendance-modal-overlay"><div class="attendance-modal"><div class="attendance-modal-head"><div><div class="attendance-event-kicker">NEW ATTENDANCE</div><h2>Create Attendance Event</h2><p>Creates the Supabase event and the Google Sheets backup workbook.</p></div><button class="attendance-modal-close" onclick="closeAttendanceEventModal()">×</button></div><div class="attendance-form"><div class="attendance-form-grid"><div class="attendance-field full"><label>EVENT / ACTIVITY NAME</label><input id="attendanceEventName" placeholder="e.g. 1st General Assembly"></div><div class="attendance-field"><label>DATE</label><input id="attendanceEventDate" type="date"></div><div class="attendance-field"><label>VENUE</label><input id="attendanceEventVenue" placeholder="e.g. Hinang Auditorium"></div><div class="attendance-field"><label>START TIME</label><input id="attendanceEventStart" type="time"></div><div class="attendance-field"><label>END TIME</label><input id="attendanceEventEnd" type="time"></div></div><div class="attendance-form-actions"><button class="attendance-button secondary" onclick="closeAttendanceEventModal()">CANCEL</button><button class="attendance-button" onclick="createAttendanceEvent()">CREATE ATTENDANCE</button></div></div></div></div>
 <div id="attendanceEventsModal" class="attendance-modal-overlay"><div class="attendance-modal"><div class="attendance-modal-head"><div><div class="attendance-event-kicker">ATTENDANCE RECORDS</div><h2>Attendance Sheets</h2><p>Select an event to open its attendance.</p></div><button class="attendance-modal-close" onclick="closeAttendanceEvents()">×</button></div><div id="attendanceEventList" class="attendance-list"></div></div></div>
 <div id="attendanceSectorModal" class="sectoral-modal" aria-hidden="true">
   <div class="sectoral-modal-backdrop" onclick="closeAttendanceSectorModal()"></div>
   <div class="sectoral-modal-card" role="dialog" aria-modal="true" aria-labelledby="attendanceSectorModalTitle">
     <div class="sectoral-modal-head">
       <div>
         <div class="sectoral-modal-kicker">PARTICIPANT CLASSIFICATION</div>
         <h3 id="attendanceSectorModalTitle">Select Sectoral Group</h3>
         <p id="attendanceSectorModalStudent">Student ID</p>
       </div>
       <button type="button" class="sectoral-modal-close" onclick="closeAttendanceSectorModal()">×</button>
     </div>
     <div class="sectoral-modal-note">You may select more than one group. Choose N/A if the participant does not belong to any listed group.</div>
     <div class="sectoral-modal-options">
       <label><input type="checkbox" value="4PS"> <span><b>1</b> 4PS</span></label>
       <label><input type="checkbox" value="IPs"> <span><b>2</b> IPs</span></label>
       <label><input type="checkbox" value="PWDs"> <span><b>3</b> PWDs</span></label>
       <label><input type="checkbox" value="Solo Parent"> <span><b>4</b> Solo Parent</span></label>
       <label><input type="checkbox" value="LGBTQIA+"> <span><b>5</b> LGBTQIA+</span></label>
       <label><input type="checkbox" value="Child of a Solo Parent"> <span><b>6</b> Child of a Solo Parent</span></label>
     </div>
     <button type="button" id="attendanceSectorNA" class="sector-na-modal" onclick="toggleAttendanceSectorNA()">N/A · NONE OF THE ABOVE</button>
     <div class="sex-selection-title">SEX</div>
     <div class="sex-selection-options">
       <label><input type="radio" name="attendanceSex" value="M"> <span><b>M</b> Male</span></label>
       <label><input type="radio" name="attendanceSex" value="F"> <span><b>F</b> Female</span></label>
     </div>
     <div class="sectoral-modal-actions">
       <button type="button" class="sector-cancel" onclick="closeAttendanceSectorModal()">CANCEL</button>
       <button type="button" class="sector-confirm" onclick="confirmAttendanceSector()">CONFIRM &amp; SUBMIT</button>
     </div>
   </div>
 </div>
 <div id="attendanceAllModal" class="attendance-modal-overlay"><div class="attendance-modal"><div class="attendance-modal-head"><div><div class="attendance-event-kicker">ATTENDANCE RECORDS</div><h2>All Attendees</h2><p>Records retrieved from Supabase.</p></div><button class="attendance-modal-close" onclick="closeAllAttendanceRecords()">×</button></div><div id="attendanceAllList" class="attendance-list"></div></div></div>
 <div id="attendancePrintModal" class="attendance-modal-overlay"><div class="attendance-modal"><div class="attendance-modal-head"><div><div class="attendance-event-kicker">READY TO PRINT</div><h2>Print Attendance Sheet</h2><p>Prepared for A4 (210 × 297 mm) paper.</p></div><button class="attendance-modal-close" onclick="closeAttendancePrintModal()">×</button></div><div class="attendance-form"><p class="attendance-print-note">The printout follows the official OSLD format. Participant pages continue automatically, numbering continues, and the minority-classification summary is always printed on a separate final page.</p><div class="attendance-form-actions"><button class="attendance-button secondary" onclick="closeAttendancePrintModal()">CANCEL</button><button class="attendance-button" onclick="printAttendanceYearLevel()">PRINT</button></div></div></div></div>
 <div id="attendancePrintDocument" class="attendance-print-document"></div>`);
 document.querySelectorAll(".attendance-modal-overlay").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("show")}));
}

async function google(payload){const r=await fetch(GOOGLE_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});if(!r.ok)throw new Error("Google Sheets request failed (HTTP "+r.status+")");return r.json()}
async function lookup(studentId){
 const sid=String(studentId||"").trim();
 if(!sid)throw new Error("Please enter a Student ID.");
 const r=await supabase.from("participants").select("student_id,student_name,year_level").eq("student_id",sid).maybeSingle();
 if(r.error)throw new Error(r.error.message||"Unable to look up the participant.");
 if(!r.data)throw new Error("Student ID was not found in the participant list.");
 const yearMap={1:"First Year",2:"Second Year",3:"Third Year",4:"Fourth Year"};
 return {
  studentId:r.data.student_id,
  studentName:r.data.student_name,
  yearLevel:yearMap[Number(r.data.year_level)]||String(r.data.year_level||"")
 };
}

function renderEvent(){const e=activeEvent;el("attendanceActiveEventName").textContent=e?e.event_name:"No attendance event selected";el("attendanceActiveEventDate").textContent=e?"Date: "+dateLabel(e.event_date):"Date: —";el("attendanceActiveEventVenue").textContent=e?"Venue: "+(e.venue||"—"):"Venue: —";el("attendanceActiveEventTime").textContent="Time: "+(e?((e.start_time||"")+(e.end_time?" – "+e.end_time:"")):"—");const b=el("attendanceOpenBackup");if(b)b.style.display=e&&e.google_spreadsheet_url?"inline-flex":"none"}
function renderStats(){const present=records.filter(r=>r.attendance_status==="PRESENT").length;const complete=records.filter(r=>r.attendance_status==="COMPLETE").length;const late=records.filter(r=>r.attendance_status==="LATE").length;const pending=records.filter(r=>r.backup_status!=="BACKED UP").length;el("attendanceStatPresent").textContent=present;el("attendanceStatComplete").textContent=complete;el("attendanceStatLate").textContent=late;el("attendanceStatPending").textContent=pending;el("attendanceBackupState").textContent=pending?"PENDING "+pending:"BACKUP READY"}
function renderRecent(){const box=el("attendanceRecentList");if(!box)return;if(!records.length){box.innerHTML='<div class="attendance-empty">No attendance has been recorded for this event yet.</div>';return}box.innerHTML=records.slice(0,30).map(r=>`<div class="attendance-recent-row"><div class="attendance-recent-name">${esc(r.student_name)}</div><div class="attendance-recent-muted attendance-id">${esc(r.student_id)}</div><div class="attendance-recent-muted">${esc(r.year_level||"—")}</div><div><span class="attendance-badge ${badgeClass(r.attendance_status)}">${esc(r.attendance_status||"")}</span></div></div>`).join("")}

async function loadAttendanceData(){buildModals();if(!supabase){console.error("Supabase client unavailable");return}try{const r=await supabase.from("attendance_events").select("*").order("event_date",{ascending:false}).order("created_at",{ascending:false});if(r.error)throw r.error;events=r.data||[];if(!activeEvent||!events.some(e=>e.event_id===activeEvent.event_id))activeEvent=events[0]||null;renderEvent();await loadRecords();if(activeEvent&&!qrRunning)startAttendanceScanner(false).catch(()=>{})}catch(e){console.error(e);renderEvent();renderStats();renderRecent()}}
async function loadRecords(){if(!activeEvent){records=[];renderStats();renderRecent();return}const r=await supabase.from("attendance_records").select("*").eq("event_id",activeEvent.event_id).order("created_at",{ascending:false});if(r.error)throw r.error;records=r.data||[];renderStats();renderRecent()}

function openAttendanceEventModal(){buildModals();el("attendanceEventModal").classList.add("show")}function closeAttendanceEventModal(){el("attendanceEventModal")?.classList.remove("show")}
function openAttendanceEvents(){renderEventList();el("attendanceEventsModal").classList.add("show")}function closeAttendanceEvents(){el("attendanceEventsModal")?.classList.remove("show")}
function openAllAttendanceRecords(){renderAll();el("attendanceAllModal").classList.add("show")}function closeAllAttendanceRecords(){el("attendanceAllModal")?.classList.remove("show")}function openActiveAttendanceBackup(){if(activeEvent?.google_spreadsheet_url)window.open(activeEvent.google_spreadsheet_url,"_blank","noopener,noreferrer")}
function openAttendancePrintModal(){el("attendancePrintModal").classList.add("show")}function closeAttendancePrintModal(){el("attendancePrintModal")?.classList.remove("show")}
function renderEventList(){const box=el("attendanceEventList");if(!events.length){box.innerHTML='<div class="attendance-empty">No attendance events have been created yet.</div>';return}box.innerHTML=events.map(e=>`<button class="attendance-event-row" onclick="selectAttendanceEvent('${String(e.event_id).replace(/'/g,"\\'")}')"><span style="text-align:left"><strong>${esc(e.event_name)}</strong><small>${esc(dateLabel(e.event_date))} · ${esc(e.venue||"No venue")}</small></span><span class="attendance-badge ${e.status==="OPEN"?"present":"pending"}">${esc(e.status||"OPEN")}</span></button>`).join("")}
async function selectAttendanceEvent(eventId){activeEvent=events.find(e=>e.event_id===eventId)||null;closeAttendanceEvents();renderEvent();await loadRecords()}

async function createAttendanceEvent(){const name=el("attendanceEventName").value.trim(),date=el("attendanceEventDate").value,venue=el("attendanceEventVenue").value.trim(),start=el("attendanceEventStart").value,end=el("attendanceEventEnd").value;if(!name||!date){alert("Please enter the event name and date.");return}const eventId=id("ATT-EVT-");const payload={event_id:eventId,event_name:name,event_date:date,venue:venue||null,start_time:start||null,end_time:end||null,created_by:CURRENT_USERNAME,status:"OPEN",backup_status:"PENDING"};const ins=await supabase.from("attendance_events").insert(payload).select().single();if(ins.error){alert(ins.error.message);return}const event=ins.data;try{const gs=await google({action:"CREATE_ATTENDANCE_WORKBOOK",eventId,eventName:name});if(gs?.success){const up=await supabase.from("attendance_events").update({google_spreadsheet_id:gs.spreadsheetId,google_spreadsheet_url:gs.spreadsheetUrl||null,backup_status:"READY",updated_at:now()}).eq("event_id",eventId).select().single();if(!up.error)Object.assign(event,up.data)}}catch(e){console.warn("Google backup workbook not ready:",e)}events.unshift(event);activeEvent=event;closeAttendanceEventModal();renderEvent();await loadRecords();el("attendanceEventName").value="";el("attendanceEventDate").value="";el("attendanceEventVenue").value="";el("attendanceEventStart").value="";el("attendanceEventEnd").value="";alert("Attendance event created successfully.")}

function setAttendanceRecordMode(mode){recordMode=mode;el("attendanceTimeInButton").classList.toggle("active",mode==="TIME IN");el("attendanceTimeOutButton").classList.toggle("active",mode==="TIME OUT");el("attendanceScannerState").textContent=mode}
function sectorGroups(){return [...document.querySelectorAll("#attendanceSectorModal input[type=checkbox]:checked")].map(x=>x.value)}
function openAttendanceSectorModal(studentId,source){pendingStudentId=studentId;pendingSource=source;pendingSex="";el("attendanceSectorModalStudent").textContent="Student ID: "+studentId;document.querySelectorAll("#attendanceSectorModal input[type=checkbox]").forEach(x=>x.checked=false);document.querySelectorAll("#attendanceSectorModal input[name=attendanceSex]").forEach(x=>x.checked=false);el("attendanceSectorNA").classList.remove("active");el("attendanceSectorModal").classList.add("show","open");el("attendanceSectorModal").setAttribute("aria-hidden","false")}
function closeAttendanceSectorModal(){const m=el("attendanceSectorModal");if(m){m.classList.remove("show","open");m.setAttribute("aria-hidden","true")}pendingStudentId="";pendingSource="";pendingSex=""}
function toggleAttendanceSectorNA(){const b=el("attendanceSectorNA");b.classList.toggle("active");if(b.classList.contains("active"))document.querySelectorAll("#attendanceSectorModal input[type=checkbox]").forEach(x=>x.checked=false)}
async function confirmAttendanceSector(){const g=sectorGroups(),na=el("attendanceSectorNA").classList.contains("active"),sex=document.querySelector("#attendanceSectorModal input[name=attendanceSex]:checked")?.value||"";if(!sex){alert("Please select Sex: M or F.");return}if(!g.length&&!na){alert("Please select a sectoral group or N/A.");return}const sid=pendingStudentId,src=pendingSource;closeAttendanceSectorModal();await recordAttendance(sid,src,na?["N/A"]:g,sex)}

async function recordAttendance(studentId,source,groups,sex=""){if(!activeEvent){alert("Please create or select an attendance event first.");return}const button=document.querySelector(".attendance-submit");if(button)button.disabled=true;try{const student=await lookup(studentId),name=student.studentName||student.name||"",year=student.yearLevel||student.year_level||"",existing=records.find(r=>String(r.student_id).toUpperCase()===String(studentId).toUpperCase()),stamp=now();el("attendancePreview").style.display="block";el("attendancePreviewName").textContent=name;el("attendancePreviewDetail").textContent=year+" · ID Number: "+studentId;let saved;
 if(recordMode==="TIME IN"){if(existing?.time_in&&!existing?.time_out){alert(name+" is already marked Present.");return}if(existing?.time_in&&existing?.time_out){alert(name+" already completed attendance.");return}const late=!!activeEvent.start_time&&new Date().toTimeString().slice(0,5)>String(activeEvent.start_time).slice(0,5);const data={event_id:activeEvent.event_id,student_id:studentId,student_name:name,year_level:year,time_in:stamp,time_out:null,late_no_time_in:late?"LATE":null,attendance_status:late?"LATE":"PRESENT",recorded_via:source==="qr"?"QR":"MANUAL",recorded_by:CURRENT_USERNAME,sex:sex||existing?.sex||null,sectoral_groups:groups||[],backup_status:"PENDING",updated_at:stamp};let r;if(existing)r=await supabase.from("attendance_records").update(data).eq("attendance_id",existing.attendance_id).select().single();else{data.attendance_id=id("ATT-REC-");data.created_at=stamp;r=await supabase.from("attendance_records").insert(data).select().single()}if(r.error)throw r.error;saved=r.data}else{if(existing?.time_out){alert(name+" already has a Time Out.");return}const data={time_out:stamp,late_no_time_in:existing?.time_in?(existing.late_no_time_in||null):"NO TIME IN",attendance_status:existing?.time_in?"COMPLETE":"LATE",recorded_via:source==="qr"?"QR":"MANUAL",recorded_by:CURRENT_USERNAME,backup_status:"PENDING",updated_at:stamp};let r;if(existing)r=await supabase.from("attendance_records").update(data).eq("attendance_id",existing.attendance_id).select().single();else{Object.assign(data,{attendance_id:id("ATT-REC-"),event_id:activeEvent.event_id,student_id:studentId,student_name:name,year_level:year,sex:existing?.sex||null,time_in:null,created_at:stamp,sectoral_groups:[]});r=await supabase.from("attendance_records").insert(data).select().single()}if(r.error)throw r.error;saved=r.data}await backupRecord(saved);await loadRecords();alert(name+" — "+saved.attendance_status+" recorded.")}catch(e){console.error(e);alert(e.message||"Unable to record attendance.")}finally{if(button)button.disabled=false;const input=el("attendanceStudentId");if(input){input.value="";input.focus()}}}
async function backupRecord(record){try{if(!activeEvent?.google_spreadsheet_id)throw new Error("Google backup workbook is not ready.");const r=await google({action:"BACKUP_ATTENDANCE",spreadsheetId:activeEvent.google_spreadsheet_id,eventName:activeEvent.event_name,attendance:record});if(!r?.success)throw new Error(r?.message||"Google Sheets backup failed.");await supabase.from("attendance_records").update({backup_status:"BACKED UP",last_backup_at:now(),updated_at:now()}).eq("attendance_id",record.attendance_id)}catch(e){console.warn(e);await supabase.from("attendance_records").update({backup_status:"PENDING",updated_at:now()}).eq("attendance_id",record.attendance_id)}}
function submitAttendanceManual(){const input=el("attendanceStudentId"),sid=input?.value.trim();if(!sid){alert("Please enter a Student ID.");input?.focus();return}if(recordMode==="TIME IN")openAttendanceSectorModal(sid,"manual");else recordAttendance(sid,"manual",[])}
function extractQr(v){let s=String(v||"").replace(/[\u200B-\u200D\uFEFF]/g,"").trim();try{const o=JSON.parse(s);if(o&&typeof o==="object")s=o.studentId||o.studentID||o.id||o.ID||s}catch{}try{if(/^https?:\/\//i.test(s)){const u=new URL(s);s=u.searchParams.get("studentId")||u.searchParams.get("studentID")||u.searchParams.get("id")||s}}catch{}return s.replace(/^student\s*id\s*(number)?\s*[:#-]?\s*/i,"").replace(/^id\s*[:#-]?\s*/i,"").trim()}
async function qrSuccess(text){const sid=extractQr(text);if(!sid)return;el("attendanceScanFrame").classList.add("detected");setTimeout(()=>el("attendanceScanFrame").classList.remove("detected"),700);await stopAttendanceScanner();if(recordMode==="TIME IN")openAttendanceSectorModal(sid,"qr");else await recordAttendance(sid,"qr",[])}
async function ensureQrLibrary(){if(window.Html5Qrcode)return true;if(qrLibraryPromise)return qrLibraryPromise;qrLibraryPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";s.onload=()=>resolve(true);s.onerror=reject;document.head.appendChild(s)});return qrLibraryPromise}
async function startAttendanceScanner(userRequested){if(qrRunning||qrStarting)return;qrStarting=true;try{await ensureQrLibrary();qr=new Html5Qrcode("attendanceReader");await qr.start({facingMode:"environment"},{fps:10,qrbox:{width:240,height:240}},qrSuccess,()=>{});qrRunning=true;el("attendanceScannerState").textContent="SCANNING";el("attendanceScannerMessage").textContent="Center the QR code inside the red corners.";el("attendanceScannerMessage").className="attendance-scanner-message success"}catch(e){el("attendanceScannerState").textContent="CAMERA ERROR";el("attendanceScannerMessage").textContent=userRequested?"Camera access was denied or unavailable. Use Manual ID instead.":"Press START CAMERA to scan an ID QR code.";el("attendanceScannerMessage").className="attendance-scanner-message error";console.warn(e)}finally{qrStarting=false}}
async function stopAttendanceScanner(){try{if(qr&&qrRunning)await qr.stop().catch(()=>{});if(qr)await qr.clear().catch(()=>{})}catch{}qr=null;qrRunning=false}
function renderAll(){const box=el("attendanceAllList");if(!records.length){box.innerHTML='<div class="attendance-empty">No attendance records.</div>';return}box.innerHTML=records.map(r=>`<div class="attendance-event-row"><span style="text-align:left"><strong>${esc(r.student_name)}</strong><small>${esc(r.student_id)} · ${esc(r.year_level||"—")} · Time In: ${esc(timeLabel(r.time_in))} · Time Out: ${esc(timeLabel(r.time_out))}</small></span><span class="attendance-badge ${badgeClass(r.attendance_status)}">${esc(r.attendance_status)}</span></div>`).join("")}
function printAttendanceYearLevel(){
 if(!activeEvent){alert("Please create or select an attendance event first.");return}

 const title=activeEvent.event_name||"Attendance";
 const date=activeEvent.event_date||new Date().toISOString().slice(0,10);
 const rows=[...records].sort((a,b)=>String(a.student_name||"").localeCompare(String(b.student_name||"")));
 const FIRST_PAGE_ROWS=18;
 const CONTINUATION_PAGE_ROWS=24;
 const groups=["4PS","IPs","PWDs","Solo Parent","LGBTQIA+","Child of a Solo Parent"];
 const counts={"4PS":0,"IPs":0,"PWDs":0,"Solo Parent":0,"LGBTQIA+":0,"Child of a Solo Parent":0};
 rows.forEach(r=>(r.sectoral_groups||[]).forEach(g=>{
   const key=g==="PWD"?"PWDs":g;
   if(Object.prototype.hasOwnProperty.call(counts,key))counts[key]++;
 }));

 const headerMarkup=`<div class="official-print-header">
      <div class="official-csu-brand">
        <div class="official-csu-name">
          <div class="official-republic">Republic of the Philippines</div>
          <div class="official-university">CARAGA STATE UNIVERSITY</div>
          <div class="official-campus">Ampayon, Butuan City 8600, Philippines</div>
          <div class="official-values"><span>Competence</span><span>Service</span><span>Uprightness</span></div>
        </div>
        <div class="official-accreditation">
          <div class="official-accreditation-box">SOCOTEC</div>
          <div class="official-accreditation-box official-accreditation-ab">AAB</div>
        </div>
      </div>
      <div class="official-osld-title">OFFICE OF STUDENT LEADERSHIP AND DEVELOPMENT</div>
    </div>`;
 const footerMarkup=`<div class="official-print-footer"><div>LEGENDS:</div><div><strong>1</strong> - 4PS&nbsp;&nbsp; <strong>2</strong> - IPs&nbsp;&nbsp; <strong>3</strong> - PWDs&nbsp;&nbsp; <strong>4</strong> - Solo Parent&nbsp;&nbsp; <strong>5</strong> - LGBTQIA+&nbsp;&nbsp; <strong>6</strong>. Child of a Solo Parent</div></div>`;

 const participantCellMarkup=(r,index)=>{
   const gs=new Set(r?.sectoral_groups||[]);
   const hasRecord=!!r;
   return `<tr>
      <td>${index}.</td>
      <td class="participant-name">${hasRecord?esc(r.student_name):""}</td>
      <td></td>
      <td>${hasRecord&&gs.has("4PS")?"✓":""}</td>
      <td>${hasRecord&&gs.has("IPs")?"✓":""}</td>
      <td>${hasRecord&&(gs.has("PWD")||gs.has("PWDs"))?"✓":""}</td>
      <td>${hasRecord&&gs.has("Solo Parent")?"✓":""}</td>
      <td>${hasRecord&&gs.has("LGBTQIA+")?"✓":""}</td>
      <td>${hasRecord&&gs.has("Child of a Solo Parent")?"✓":""}</td>
      <td>${hasRecord&&r.sex==="M"?"✓":""}</td>
      <td>${hasRecord&&r.sex==="F"?"✓":""}</td>
      <td class="official-present">${hasRecord&&r.time_in?"PRESENT":""}</td>
    </tr>`;
 };

 const tableMarkup=(chunk,startNumber,rowCount)=>{
   let body="";
   for(let i=0;i<rowCount;i++) body+=participantCellMarkup(chunk[i]||null,startNumber+i);
   return `<table class="official-attendance-table">
      <colgroup>
        <col class="col-no"><col class="col-name"><col class="col-org">
        <col class="col-sector"><col class="col-sector"><col class="col-sector"><col class="col-sector"><col class="col-sector"><col class="col-sector">
        <col class="col-sex"><col class="col-sex"><col class="col-signature">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">NO.<br>.</th>
          <th rowspan="2">Name of Participants</th>
          <th rowspan="2">Organization<br>(ACRONYM)</th>
          <th colspan="6">Sectoral Groups</th>
          <th colspan="2">Sex</th>
          <th rowspan="2">Signature</th>
        </tr>
        <tr>
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th>
          <th>M</th><th>F</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
 };

 const pages=[];
 let cursor=0;
 let page=0;
 do{
   const firstPage=page===0;
   const pageRows=firstPage?FIRST_PAGE_ROWS:CONTINUATION_PAGE_ROWS;
   const start=cursor;
   const chunk=rows.slice(cursor,cursor+pageRows);
   cursor+=chunk.length;
   pages.push(`<section class="official-print-page ${firstPage?"official-first-page":"official-continuation-page"}">
      ${headerMarkup}
      <div class="official-page-body">
        ${firstPage?`<div class="official-event-block">
          <div class="official-event-name">${esc(title)}</div>
          <div class="official-details">
            <div>Title of Activity: <span>${esc(title)}</span></div>
            <div>Venue: <span>${esc(activeEvent.venue||"")}</span></div>
            <div>Date: <span>${esc(dateLabel(date))}</span></div>
          </div>
        </div>`:""}
        ${tableMarkup(chunk,start+1,pageRows)}
      </div>
      ${footerMarkup}
   </section>`);
   page++;
 }while(cursor<rows.length || page===1);

 const summary=[
   ["4Ps",counts["4PS"]],
   ["IPs",counts["IPs"]],
   ["PWDs",counts["PWDs"]],
   ["Solo Parent",counts["Solo Parent"]],
   ["LGBTQIA+",counts["LGBTQIA+"]],
   ["Child of a Solo Parent",counts["Child of a Solo Parent"]]
 ];
 pages.push(`<section class="official-print-page official-summary-page">
    ${headerMarkup}
    <div class="official-summary-wrap">
      <table class="official-minority-table">
        <thead><tr><th>Minority Classification</th><th>Number of Students</th></tr></thead>
        <tbody>${summary.map(x=>`<tr><td>${esc(x[0])}</td><td>${x[1]}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    ${footerMarkup}
 </section>`);

 el("attendancePrintDocument").innerHTML=pages.join("");
 closeAttendancePrintModal();
 document.body.classList.add("psabe-attendance-printing");
 window.print();
 setTimeout(()=>document.body.classList.remove("psabe-attendance-printing"),700);
}

document.addEventListener("keydown",e=>{if(e.key==="Enter"&&document.activeElement?.id==="attendanceStudentId"){e.preventDefault();submitAttendanceManual()}});

Object.assign(window,{loadAttendanceData,openAttendanceEventModal,closeAttendanceEventModal,openAttendanceEvents,closeAttendanceEvents,selectAttendanceEvent,createAttendanceEvent,setAttendanceRecordMode,submitAttendanceManual,startAttendanceScanner,openAttendanceSectorModal,closeAttendanceSectorModal,toggleAttendanceSectorNA,confirmAttendanceSector,openAllAttendanceRecords,closeAllAttendanceRecords,openActiveAttendanceBackup,openAttendancePrintModal,closeAttendancePrintModal,printAttendanceYearLevel});
})();
