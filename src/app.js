"use strict";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-700-italic.css";
import "@fontsource/barlow-condensed/latin-800-italic.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource/ibm-plex-sans-arabic/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/latin-500.css";
import "@fontsource/ibm-plex-sans-arabic/latin-600.css";
import "@fontsource/ibm-plex-sans-arabic/latin-700.css";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import { DAYS, CYCLE, INTRO, C, T } from "./data.js";
import VIDEOS from "./videos.json";

/* ════════════════════════════════════════════════════════════════
   State
   ════════════════════════════════════════════════════════════════ */
const S={lang:"en",unit:"kg",view:"today",cycleIndex:0,active:null,sessions:[],
         status:"savedlocal",statusErr:false,open:{},timer:null,player:null,
         hintOff:false,needRefresh:false,
         cached:new Set(),dl:null,dlErr:false,est:null};
const LS="argym_v1";
const VCACHE="videos-v1";            /* keep in sync with src/sw.js — never rename */
const HAS_CACHE="caches" in window;
const t=k=>(T[k]&&T[k][S.lang])||"";
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:0;};
const $=(s,r=document)=>r.querySelector(s);

function lsRead(){try{return JSON.parse(localStorage.getItem(LS)||"null")}catch(e){return null}}
function lsWrite(){
  try{
    localStorage.setItem(LS,JSON.stringify({lang:S.lang,unit:S.unit,cycleIndex:S.cycleIndex,active:S.active,
      sessions:S.sessions.slice(0,1000),hintOff:S.hintOff,v:1}));
    if(S.statusErr)setStatus("savedlocal");
  }catch(e){setStatus("quota",true);}
}

/* ── plan helpers ───────────────────────────────────────────────── */
const slotKey=i=>CYCLE[((i%7)+7)%7];
const slotNo=i=>(((i%7)+7)%7)+1;
const dayOf=k=>Object.prototype.hasOwnProperty.call(DAYS,k)?DAYS[k]:null;
function blankEntries(k){
  const d=dayOf(k);if(!d)return{};
  const o={};
  d.ex.forEach((e,i)=>{
    o[i]={w:Array.from({length:e.wu},()=>({kg:"",r:"",d:false})),
          s:Array.from({length:e.s},()=>({kg:"",r:"",d:false}))};
  });
  return o;
}
function totals(a){
  if(!a)return{done:0,all:0,vol:0};
  const d=dayOf(a.dayKey);let done=0,all=0,vol=0;
  if(d)d.ex.forEach((e,i)=>{
    const en=a.e[i];if(!en)return;
    all+=e.s;
    en.s.forEach(st=>{if(st.d){done++;vol+=num(st.kg)*num(st.r);}});
  });
  return{done,all,vol};
}
/* most recent logged set for an exercise, by name */
function lastFor(name,exceptId){
  for(const s of S.sessions){
    if(exceptId&&s.id===exceptId)continue;
    const hit=(s.ex||[]).find(x=>x.n===name&&(x.s||[]).some(v=>v.d));
    if(hit){
      const sets=hit.s.filter(v=>v.d);
      if(sets.length)return{sets,when:s.finishedAt};
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   Persistence — localStorage on this device only
   ════════════════════════════════════════════════════════════════ */
function setStatus(k,err){
  S.status=k;S.statusErr=!!err;
  const n=$("#sync");if(n){n.textContent=t(k);n.className="sync"+(err?" err":"");}
}
function saveState(){lsWrite();}
function saveActive(){lsWrite();}

/* ════════════════════════════════════════════════════════════════
   Videos — local files, cached in `videos-v1` for offline
   ════════════════════════════════════════════════════════════════ */
const vidOf=slug=>slug&&Object.prototype.hasOwnProperty.call(VIDEOS,slug)?slug:null;
const vurl=slug=>"/videos/"+slug+".mp4";
const uniq=a=>[...new Set(a)];
const daySlugs=k=>uniq(DAYS[k].ex.map(e=>vidOf(e.v)).filter(Boolean));
const allSlugs=()=>uniq(Object.keys(DAYS).flatMap(daySlugs));
const bytesOf=sl=>sl.reduce((a,s)=>a+(VIDEOS[s]?VIDEOS[s].bytes:0),0);
const mins=sec=>Math.round(sec/60).toLocaleString(S.lang==="ar"?"ar-EG":"en-US");
/* sizes are wrapped in a bidi isolate so “94 MB” doesn't flip to “MB 94” in Arabic */
function fmtB(b){
  const m=b/1e6;
  return "⁦"+(b>=1e9?(b/1e9).toFixed(1)+" GB":(m>=10?Math.round(m):m.toFixed(1))+" MB")+"⁩";
}
async function scanCache(){
  if(!HAS_CACHE)return;
  try{
    const keys=await (await caches.open(VCACHE)).keys();
    S.cached=new Set(keys.map(r=>(new URL(r.url).pathname.match(/^\/videos\/([^/]+)\.mp4$/)||[])[1]).filter(Boolean));
  }catch(e){}
}
async function refreshEstimate(){
  try{if(navigator.storage&&navigator.storage.estimate)S.est=await navigator.storage.estimate();}catch(e){}
}
/* Sequential downloads straight into the cache. The marker header tells the
   service worker not to start its own background copy of the same file. */
async function download(key,slugs){
  if(S.dl||!HAS_CACHE)return;
  const todo=slugs.filter(s=>!S.cached.has(s));
  S.dlErr=false;
  S.dl={key,n:0,N:todo.length,done:0,total:bytesOf(todo)};
  renderOffline();
  try{
    const cache=await caches.open(VCACHE);
    for(const slug of todo){
      if(!(await cache.match(vurl(slug),{ignoreVary:true})))
        await cache.add(new Request(vurl(slug),{headers:{"X-ARGYM-Download":"1"}}));
      S.dl.n++;S.dl.done+=VIDEOS[slug].bytes;
      markCached(slug);
    }
  }catch(e){S.dlErr=true;}
  S.dl=null;
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  await refreshEstimate();
  renderOffline();
}
/* in-place: the ✓ on video buttons and captions, plus the offline panel */
function markCached(slug,skipPanel){
  S.cached.add(slug);
  document.querySelectorAll('[data-slug="'+slug+'"]').forEach(b=>{
    if(!b.querySelector(".okc"))b.insertAdjacentHTML("beforeend",'<span class="okc" aria-label="'+esc(t("avail"))+'">✓</span>');
  });
  document.querySelectorAll('[data-cap="'+slug+'"]').forEach(c=>{
    if(!c.querySelector(".okd"))c.insertAdjacentHTML("beforeend",'<span class="okd">✓ '+esc(t("avail"))+'</span>');
  });
  if(!skipPanel)renderOffline();
}

/* ════════════════════════════════════════════════════════════════
   Rendering
   ════════════════════════════════════════════════════════════════ */
const ICON_PLAY='<svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true"><path d="M0 0l9 5-9 5z" fill="currentColor"/></svg>';
const ICON_CHK='<svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true"><path d="M1.5 6.2l4 4L13.5 1.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_SHARE='<svg width="16" height="19" viewBox="0 0 16 19" aria-hidden="true"><path d="M8 1v11M4.2 4.6L8 1l3.8 3.6M5.5 7.5H2.5v10h11v-10h-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function noteBlock(txt,who){
  return '<div class="note">'+(who?'<span class="who">'+esc(who)+'</span>':'')+esc(txt)+'</div>';
}
function bullets(arr){
  return '<ul class="notelist">'+arr.map(x=>'<li><span>'+esc(x)+'</span></li>').join("")+'</ul>';
}
function sectionH(title){
  return '<div class="sect-h"><h2>'+esc(title)+'</h2></div>';
}
/* The coach's own demos, served from this app and playable offline once cached. */
function playerBlock(slug,name,pad){
  const m=VIDEOS[slug]||{},tall=m.h>m.w;
  return '<div class="player"'+(pad?' style="margin:0"':'')+'>'+
    '<div class="fr'+(tall?" tall":"")+'"><video controls playsinline preload="none" '+
      'poster="/videos/posters/'+esc(slug)+'.jpg" src="'+esc(vurl(slug))+'" title="'+esc(name)+'"></video></div>'+
    '<div class="cap" data-cap="'+esc(slug)+'"><span>'+esc(t("coachdemo"))+'</span>'+
      (S.cached.has(slug)?'<span class="okd">✓ '+esc(t("avail"))+'</span>':'')+'</div></div>';
}
/* A missing, not-yet-downloaded file while offline: say so instead of a dead player. */
function wireVideos(){
  document.querySelectorAll(".player video").forEach(v=>{
    v.addEventListener("error",()=>{
      const box=v.parentNode;if(!box)return;
      box.innerHTML='<div class="fb"><p>'+esc(t("notdl"))+'</p></div>';
    },{once:true});
  });
}

/* ── TODAY ──────────────────────────────────────────────────────── */
function viewToday(){
  const k=S.active?S.active.dayKey:slotKey(S.cycleIndex);
  const no=S.active?S.active.slot:slotNo(S.cycleIndex);
  const isRest=k==="rest";
  let h="";

  /* hero */
  const d=dayOf(k);
  h+='<section class="notch hero"><div class="in">';
  h+='<div class="hero-top">';
  h+='<div style="flex:1;min-width:0"><div class="eyebrow">'+esc(S.active?t("inprog"):t("nextup"))+'</div>';
  if(isRest){
    h+='<div class="hero-day" style="color:var(--calm)">'+esc(t("restday"))+'</div>';
  }else{
    const parts=d.label.split(" ");
    h+='<div class="hero-day">'+esc(parts[0])+' <em>'+esc(parts[1]||"")+'</em></div>';
  }
  h+='</div><div class="slotpill">'+esc(t("slot"))+' '+no+' / 7</div></div>';

  if(isRest){
    h+='<div style="margin-top:14px">'+noteBlock(C.tips.items[4][S.lang],"Coach")+'</div>';
    h+='<button class="cta calm" data-a="restdone">'+esc(t("markrest"))+'</button>';
  }else{
    const tt=totals(S.active);
    const ws=d.ex.reduce((a,e)=>a+e.s,0);
    h+='<p class="hero-sum"><b>'+d.ex.length+'</b> '+esc(t("exs"))+' · <b>'+ws+'</b> '+esc(t("wsets"))+'</p>';
    h+='<button class="cta" data-a="'+(S.active?"go":"start")+'">'+esc(S.active?t("resume"):t("start"))+
       (S.active?' <span style="font-family:var(--mono);font-size:14px">'+tt.done+'/'+tt.all+'</span>':'')+'</button>';
  }
  h+='</div></section>';

  /* first-log nudge — slide 4 */
  if(!S.sessions.length){
    h+='<div style="margin-top:12px">'+noteBlock(C.tips.items[5][S.lang],t("firstlog"))+'</div>';
  }

  /* split — slide 6 */
  h+='<section class="sect">'+sectionH(C.split.h[S.lang]);
  h+='<div style="margin-bottom:12px">'+bullets(C.split[S.lang])+'</div>';
  h+='<div class="split">';
  CYCLE.forEach((ck,i)=>{
    const dd=dayOf(ck),now=i===(((S.cycleIndex%7)+7)%7);
    h+='<div class="split-row'+(ck==="rest"?" is-rest":"")+(now?" is-now":"")+'">';
    h+='<span class="nm">'+esc(dd?dd.label:t("restday"))+'</span>';
    if(dd)h+='<span class="ct">'+dd.ex.length+' '+esc(t("exs"))+'</span>';
    h+='<span class="dy">'+esc(t("slot")).toUpperCase()+' '+(i+1)+'</span></div>';
  });
  h+='</div></section>';

  /* daily steps — slide 19 */
  h+='<section class="sect">'+sectionH(C.cardio.stepsH[S.lang]);
  h+='<div class="card" style="padding:14px"><p style="font-family:var(--mono);font-size:13px;color:var(--muted)">— '+
     esc(C.cardio.noTarget[S.lang])+'</p><p style="margin-top:9px;font-size:13px;line-height:1.62;color:var(--text-2)">'+
     esc(C.cardio.steps[S.lang])+'</p></div></section>';

  /* recent */
  if(S.sessions.length){
    h+='<section class="sect">'+sectionH(T.history[S.lang]);
    h+='<div class="stats">';
    h+='<div><div class="v">'+S.sessions.length+'</div><div class="k">'+esc(t("sessions"))+'</div></div>';
    const tv=S.sessions.reduce((a,s)=>a+(s.vol||0),0);
    h+='<div><div class="v">'+Math.round(tv/1000)+'k</div><div class="k">'+esc(t("volume"))+' '+S.unit+'</div></div>';
    const ts=S.sessions.reduce((a,s)=>a+(s.setsDone||0),0);
    h+='<div><div class="v">'+ts+'</div><div class="k">'+esc(t("sets"))+'</div></div>';
    h+='</div>';
    h+='<div class="hist">'+S.sessions.slice(0,3).map(histRow).join("")+'</div></section>';
  }
  h+=foot();
  return h;
}

/* ── WORKOUT ────────────────────────────────────────────────────── */
function viewWorkout(){
  const a=S.active;if(!a)return viewToday();
  const d=dayOf(a.dayKey);let h="";
  const parts=d.label.split(" ");
  h+='<section class="notch hero"><div class="in" style="padding:16px 18px">';
  h+='<div class="hero-top"><div style="flex:1"><div class="eyebrow">'+esc(t("inprog"))+'</div>';
  h+='<div class="hero-day" style="font-size:34px">'+esc(parts[0])+' <em>'+esc(parts[1]||"")+'</em></div></div>';
  h+='<div class="slotpill">'+esc(t("slot"))+' '+a.slot+' / 7</div></div></div></section>';

  h+='<div class="exlist">';
  d.ex.forEach((e,i)=>{h+=exCard(e,i,a.e[i]||{w:[],s:[]});});
  h+='</div>';

  /* cardio — slides 19 + 20 */
  h+='<section class="sect">'+sectionH(C.cardio.h[S.lang]);
  h+='<div class="card" style="padding:14px">';
  h+='<dl class="kv">';
  h+='<div><dt>'+esc(C.cardio.lbl.when[S.lang])+'</dt><dd>'+esc(C.cardio.when[S.lang])+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.type[S.lang])+'</dt><dd>'+esc(C.cardio.type[S.lang])+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.dur[S.lang])+'</dt><dd>'+esc(C.cardio.dur[S.lang])+' '+esc(t("minutes"))+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.notes[S.lang])+'</dt><dd>'+esc(C.cardio.notes[S.lang])+'</dd></div>';
  h+='</dl>';
  h+='<div class="setrow" style="margin-top:12px">';
  h+='<span class="tag">min</span>';
  h+='<div class="fld"><input id="cardio-min" inputmode="numeric" placeholder="20" value="'+esc(a.cardio.min)+'" data-c="min" aria-label="'+esc(C.cardio.lbl.dur[S.lang])+'"><u>'+esc(t("minutes"))+'</u></div>';
  h+='<button class="tick" data-c="done" aria-pressed="'+(a.cardio.done?"true":"false")+'" aria-label="'+esc(t("cardiodone"))+'">'+ICON_CHK+'</button>';
  h+='</div>';
  h+='<div style="margin-top:12px"><button class="disc" data-d="mistakes" aria-expanded="'+(S.open.mistakes?"true":"false")+'">'+
     esc(C.mistakes.h[S.lang])+'<span class="cv">▼</span></button>';
  if(S.open.mistakes)h+='<div class="discbody">'+bullets(C.mistakes[S.lang])+'</div>';
  h+='</div></div></section>';
  h+=foot();
  return h;
}

function exCard(e,i,en){
  const allDone=en.s.length&&en.s.every(s=>s.d);
  const v=vidOf(e.v);
  let h='<article class="ex'+(allDone?" is-done":"")+'">';
  h+='<div class="ex-h"><span class="ex-n">'+(i+1)+'</span><div class="ex-t"><h3>'+esc(e.n)+'</h3><div class="chips">';
  if(e.wu)h+='<button class="chip i" data-i="wu">W.U ×'+e.wu+'</button>';
  h+='<button class="chip i" data-i="ws">'+e.s+' × '+esc(e.reps)+' '+esc(t("reps"))+'</button>';
  h+='<button class="chip i" data-i="rir">RIR '+esc(e.rir)+'</button>';
  h+='<span class="chip">'+esc(t("rest"))+' '+esc(e.rest)+'</span>';
  h+='</div></div>';
  const pk="ex-"+i,on=S.player===pk;
  h+=v?'<button class="vid'+(on?" on":"")+'" data-pv="'+pk+'" data-slug="'+esc(v)+'" aria-expanded="'+
          (on?"true":"false")+'">'+ICON_PLAY+esc(on?t("hide"):t("watch"))+
          (S.cached.has(v)?'<span class="okc" aria-label="'+esc(t("avail"))+'">✓</span>':'')+'</button>'
        :'<button class="vid off" data-i="novid">'+esc(t("novid"))+'</button>';
  h+='</div>';
  if(on&&v)h+=playerBlock(v,e.n);
  h+='<div class="rows">';

  if(en.w.length){
    h+='<div class="rowlbl">'+esc(t("wu"))+'</div>';
    h+='<div style="margin:2px 0 6px">'+noteBlock(C.tips.items[0][S.lang],"Coach")+'</div>';
    en.w.forEach((st,j)=>{h+=setRow(e,i,j,st,true);});
  }
  h+='<div class="rowlbl">'+esc(t("work"))+'</div>';
  const last=lastFor(e.n);
  en.s.forEach((st,j)=>{
    h+=setRow(e,i,j,st,false);
    const L=last&&last.sets[j];
    if(L)h+='<div class="last"><span>'+esc(t("lasttime"))+'</span> <b>'+esc(L.kg)+S.unit+' × '+esc(L.r)+'</b></div>';
  });
  if(last)h+='<div style="margin-top:8px">'+noteBlock(C.tips.items[2][S.lang],"Coach")+'</div>';
  h+='</div></article>';
  return h;
}
function setRow(e,i,j,st,isWu){
  const p=isWu?"w":"s",id="f-"+p+i+"-"+j;
  return '<div class="setrow'+(isWu?" wu":"")+'">'+
    '<span class="tag">'+(isWu?"W.U "+(j+1):(j+1))+'</span>'+
    '<div class="fld"><input id="'+id+'-kg" inputmode="decimal" placeholder="0" value="'+esc(st.kg)+
      '" data-x="'+i+'" data-p="'+p+'" data-j="'+j+'" data-f="kg" aria-label="weight"><u>'+S.unit+'</u></div>'+
    '<span class="xmark">×</span>'+
    '<div class="fld" style="max-width:88px"><input id="'+id+'-r" inputmode="numeric" placeholder="'+esc(e.reps)+
      '" value="'+esc(st.r)+'" data-x="'+i+'" data-p="'+p+'" data-j="'+j+'" data-f="r" aria-label="reps"></div>'+
    '<button class="tick" data-x="'+i+'" data-p="'+p+'" data-j="'+j+'" aria-pressed="'+(st.d?"true":"false")+
      '" aria-label="'+esc(t("done"))+'">'+ICON_CHK+'</button></div>';
}

/* ── GUIDE ──────────────────────────────────────────────────────── */
function viewGuide(){
  let h="";
  /* 1 — about this version (slide 5) + intro video */
  h+='<section class="sect" style="margin-top:18px">'+sectionH(C.about.h[S.lang]);
  h+='<div class="notch"><div class="in">';
  h+=C.about[S.lang].map((p,n)=>'<p class="'+(S.lang==="ar"?"arabic":"")+'" style="'+(n?"margin-top:12px;":"")+
     'font-size:14.5px;line-height:1.75;color:var(--text-2)">'+esc(p)+'</p>').join("");
  h+='</div></div>';
  if(vidOf(INTRO)){
    if(S.player==="intro"){
      h+='<div style="margin-top:12px">'+playerBlock(INTRO,t("watchintro"),true)+'</div>';
    }else{
      h+='<button class="vcard" style="margin-top:12px;width:100%;text-align:start" data-pv="intro">'+
         '<span class="play"></span><span class="m"><b>'+esc(t("watchintro"))+'</b><span>'+
         esc(mins(VIDEOS[INTRO].dur)+' '+t("introsub"))+'</span></span></button>';
    }
  }
  h+='</section>';

  /* 2 — offline videos */
  h+='<section class="sect" id="offline">'+sectionH(t("offline"))+offlineBody()+'</section>';

  /* 3 — introduction (slide 2) */
  h+='<section class="sect">'+sectionH(C.intro.h[S.lang])+bullets(C.intro[S.lang])+'</section>';

  /* 4 — glossary (slide 3) */
  h+='<section class="sect">'+sectionH(C.gloss.h[S.lang])+'<div style="display:flex;flex-direction:column;gap:9px">';
  C.gloss.items.forEach(it=>{
    h+='<div class="card" style="padding:12px 14px"><b style="font-size:13.5px;color:var(--accent-hi)">'+
       esc(it.t[S.lang])+'</b><p style="margin-top:5px;font-size:13.5px;line-height:1.62;color:var(--text-2)">'+
       esc(it.d[S.lang])+'</p></div>';
  });
  h+='</div></section>';

  /* 5 — tips (slide 4) */
  h+='<section class="sect">'+sectionH(C.tips.h[S.lang])+
     bullets(C.tips.items.map(x=>x[S.lang]))+'</section>';

  /* 6 — training split (slide 6) */
  h+='<section class="sect">'+sectionH(C.split.h[S.lang])+bullets(C.split[S.lang]);
  h+='<div class="split" style="margin-top:12px">';
  CYCLE.forEach((ck,i)=>{
    const dd=dayOf(ck);
    h+='<div class="split-row'+(ck==="rest"?" is-rest":"")+'"><span class="nm">'+
       esc(dd?dd.label:t("restday"))+'</span>'+(dd?'<span class="ct">'+dd.ex.length+' '+esc(t("exs"))+'</span>':'')+
       '<span class="dy">'+esc(t("slot")).toUpperCase()+' '+(i+1)+'</span></div>';
  });
  h+='</div></section>';

  /* 7 — cardio (slide 19) */
  h+='<section class="sect">'+sectionH(C.cardio.h[S.lang]);
  h+='<dl class="kv">';
  h+='<div><dt>'+esc(C.cardio.lbl.when[S.lang])+'</dt><dd>'+esc(C.cardio.when[S.lang])+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.type[S.lang])+'</dt><dd>'+esc(C.cardio.type[S.lang])+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.dur[S.lang])+'</dt><dd>'+esc(C.cardio.dur[S.lang])+' '+esc(t("minutes"))+'</dd></div>';
  h+='<div><dt>'+esc(C.cardio.lbl.notes[S.lang])+'</dt><dd>'+esc(C.cardio.notes[S.lang])+'</dd></div>';
  h+='</dl>';
  h+='<div class="card" style="margin-top:10px;padding:13px"><b style="font-size:12.5px;color:var(--text)">'+
     esc(C.cardio.stepsH[S.lang])+'</b><p style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px">— '+
     esc(C.cardio.noTarget[S.lang])+'</p><p style="margin-top:8px;font-size:13.5px;line-height:1.62;color:var(--text-2)">'+
     esc(C.cardio.steps[S.lang])+'</p></div></section>';

  /* 8 — cardio mistakes (slide 20) */
  h+='<section class="sect">'+sectionH(C.mistakes.h[S.lang])+bullets(C.mistakes[S.lang])+'</section>';

  /* 9 — closing (slide 22) */
  h+='<section class="sect">'+sectionH(C.closing.h[S.lang]);
  h+='<div class="notch"><div class="in">'+C.closing[S.lang].map((p,n)=>
     '<p style="'+(n?"margin-top:10px;":"")+'font-size:15.5px;line-height:1.7;color:'+(n?"var(--text-2)":"var(--text)")+
     ';font-weight:'+(n?"400":"600")+'">'+esc(p)+'</p>').join("")+'</div></div></section>';
  h+=foot();
  return h;
}

/* ── offline videos panel (Guide) ───────────────────────────────── */
function offlineBody(){
  if(!HAS_CACHE)return '<div class="card dlc"><p class="dim">'+esc(t("dlnone"))+'</p></div>';
  const dl=S.dl,all=allSlugs(),left=all.filter(s=>!S.cached.has(s));
  let h='<div class="card dlc"><p class="dim">'+esc(t("offlinesub"))+'</p>';

  if(dl){
    const pct=dl.total?Math.round(dl.done/dl.total*100):0;
    h+='<div class="dlp" role="status"><div class="t"><span>'+esc(t("dling"))+' <b>'+dl.n+'/'+dl.N+'</b></span>'+
       '<span>'+fmtB(dl.done)+' / '+fmtB(dl.total)+'</span></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';
  }
  h+=left.length
    ?'<button class="cta" data-dl="all"'+(dl?" disabled":"")+'>'+esc(t("dlall"))+' <span class="sz">'+fmtB(bytesOf(left))+'</span></button>'
    :'<div class="cta ghost ok">✓ '+all.length+'/'+all.length+' '+esc(t("videos"))+'</div>';

  h+='<div class="split dll">';
  Object.keys(DAYS).forEach(k=>{
    const sl=daySlugs(k),got=sl.filter(s=>S.cached.has(s)).length;
    h+='<div class="split-row"><span class="nm">'+esc(DAYS[k].label)+'</span>'+
       '<span class="ct">'+got+'/'+sl.length+' · '+fmtB(bytesOf(sl))+'</span>';
    h+=got===sl.length?'<span class="vid off">✓ '+esc(t("dldone"))+'</span>'
      :dl&&dl.key===k?'<span class="vid on">'+dl.n+'/'+dl.N+'</span>'
      :'<button class="vid" data-dl="'+k+'"'+(dl?" disabled":"")+'>'+esc(t("dlday"))+'</button>';
    h+='</div>';
  });
  h+='</div>';

  /* the split breakdown is big — its own button, never part of “all” */
  if(vidOf(INTRO)){
    const sz='<span class="sz">'+esc(mins(VIDEOS[INTRO].dur)+' '+t("minutes"))+' · '+fmtB(VIDEOS[INTRO].bytes)+'</span>';
    h+=S.cached.has(INTRO)?'<div class="cta ghost ok sm">✓ '+esc(t("introname"))+' · '+esc(t("dldone"))+'</div>'
      :dl&&dl.key==="intro"?'<div class="cta ghost sm" role="status">'+esc(t("dling"))+'… '+sz+'</div>'
      :'<button class="cta ghost sm" data-dl="intro"'+(dl?" disabled":"")+'>'+esc(t("dlintro"))+' '+sz+'</button>';
  }

  if(S.dlErr)h+='<p class="warnp" role="alert">'+esc(t("dlfail"))+'</p>';
  if(S.est&&S.est.quota)h+='<p class="est">'+esc(t("storage"))+': '+fmtB(S.est.usage||0)+' / '+fmtB(S.est.quota)+'</p>';
  return h+'</div>';
}
function renderOffline(){
  const n=$("#offline");
  if(n)n.innerHTML=sectionH(t("offline"))+offlineBody();
}

/* ── HISTORY ────────────────────────────────────────────────────── */
function histRow(s){
  const d=new Date(s.finishedAt);
  const lbl=(dayOf(s.dayKey)||{label:t("restday")}).label;
  const dt=d.toLocaleDateString(S.lang==="ar"?"ar-EG":"en-GB",{day:"numeric",month:"short"});
  let h='<div><button class="hrow" data-h="'+esc(s.id)+'" aria-expanded="'+(S.open[s.id]?"true":"false")+'">';
  h+='<span class="d">'+esc(lbl)+'</span><span class="m">'+(s.setsDone||0)+' '+esc(t("sets"))+
     ' · '+Math.round(s.vol||0).toLocaleString("en-US")+' '+S.unit+'</span><span class="dt">'+esc(dt)+'</span></button>';
  if(S.open[s.id]){
    h+='<div class="hdet">';
    (s.ex||[]).forEach(x=>{
      const done=(x.s||[]).filter(v=>v.d);
      if(!done.length)return;
      h+='<div><i>'+esc(x.n)+'</i> — '+done.map(v=>esc(v.kg)+"×"+esc(v.r)).join(", ")+'</div>';
    });
    if(s.cardio&&s.cardio.done)h+='<div><i>'+esc(C.cardio.type[S.lang])+'</i> — '+esc(s.cardio.min||C.cardio.dur.en)+' '+esc(t("minutes"))+'</div>';
    h+='</div>';
  }
  return h+'</div>';
}
function viewHistory(){
  let h='<section class="sect" style="margin-top:18px">'+sectionH(T.history[S.lang]);
  if(!S.sessions.length){
    h+='<div class="card" style="padding:18px"><p style="color:var(--muted);font-size:13.5px">'+esc(t("nohist"))+'</p></div>';
    h+='<div style="margin-top:12px">'+noteBlock(C.tips.items[5][S.lang],"Coach")+'</div>';
  }else{
    h+='<div class="hist">'+S.sessions.map(histRow).join("")+'</div>';
  }
  h+='</section>';

  /* backup */
  h+='<section class="sect">'+sectionH(t("backup"));
  h+='<div class="card bk"><p class="dim">'+esc(t("backupsub"))+'</p><div class="row">'+
     '<button class="cta ghost" data-a="export"'+(S.sessions.length?"":" disabled")+'>'+esc(t("exportb"))+'</button>'+
     '<button class="cta ghost" data-a="import">'+esc(t("importb"))+'</button></div></div></section>';
  return h+foot();
}

function foot(){
  return '<div class="foot"><span id="sync" class="sync'+(S.statusErr?" err":"")+'">'+esc(t(S.status))+'</span><br>'+esc(t("srcnote"))+'</div>';
}

/* ── banners: update ready, iOS install hint ────────────────────── */
const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const standalone=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
function renderBanner(){
  let h="";
  if(S.needRefresh)h+='<button class="bn up" data-a="update">'+esc(t("update"))+'</button>';
  if(IS_IOS&&!standalone()&&!S.hintOff)
    h+='<div class="bn">'+ICON_SHARE+'<span>'+esc(t("install"))+'</span>'+
       '<button class="x" data-a="hidehint" aria-label="'+esc(t("dismiss"))+'">✕</button></div>';
  $("#bnr").innerHTML=h;
}

/* ── dock ───────────────────────────────────────────────────────── */
function renderDock(){
  const n=$("#dock");
  if(S.view!=="workout"||!S.active){n.innerHTML="";return;}
  const tt=totals(S.active);
  const pct=tt.all?Math.round(tt.done/tt.all*100):0;
  n.innerHTML='<div class="dock"><div class="dock-in"><div class="prog">'+
    '<div class="t"><span><b>'+tt.done+'</b> / '+tt.all+' '+esc(t("sets"))+'</span>'+
    '<span>'+Math.round(tt.vol).toLocaleString("en-US")+' '+S.unit+'</span></div>'+
    '<div class="bar"><i style="width:'+pct+'%"></i></div></div>'+
    '<button class="cta" data-a="finish">'+esc(t("finish"))+'</button></div></div>';
}
function renderTimer(){
  const n=$("#overlay"),tm=S.timer;
  if(n.dataset.k==="modal")return;            /* a dialog owns the layer */
  if(!tm){if(n.dataset.k==="timer"){n.innerHTML="";n.dataset.k="";}return;}
  const left=Math.max(0,Math.ceil((tm.endsAt-Date.now())/1000));
  const mm=Math.floor(left/60),ss=String(left%60).padStart(2,"0");
  n.dataset.k="timer";
  n.innerHTML='<div class="timer'+(left===0?" done":"")+'"><div class="timer-in">'+
    '<span class="cd">'+mm+':'+ss+'</span><span class="lb"><b>'+esc(t("resting"))+'</b>'+esc(tm.name)+'</span>'+
    '<button data-a="skiprest">'+esc(left===0?t("golift"):t("skip"))+'</button></div></div>';
}
function startTimer(name,sec){S.timer={endsAt:Date.now()+sec*1000,name:name};renderTimer();}
setInterval(()=>{if(S.timer){if(Date.now()-S.timer.endsAt>20000){S.timer=null;}renderTimer();}},1000);

/* ── modal ──────────────────────────────────────────────────────── */
function modal(title,body){
  const n=$("#overlay");n.dataset.k="modal";
  n.innerHTML='<div class="scrim" data-a="closemodal"><div class="modal" role="dialog" aria-modal="true">'+
    '<h3>'+esc(title)+'</h3>'+body+'<button class="x" data-a="closemodal">'+esc(t("close"))+'</button></div></div>';
}
function closeModal(){const n=$("#overlay");n.innerHTML="";n.dataset.k="";renderTimer();}

/* ── root render ────────────────────────────────────────────────── */
function render(){
  document.body.setAttribute("dir",S.lang==="ar"?"rtl":"ltr");
  document.documentElement.setAttribute("lang",S.lang);
  const tabs=[["today",t("today")],["guide",t("guide")],["history",t("history")]];
  $("#tabs").innerHTML=tabs.map(([k,l])=>'<button class="tab" data-v="'+k+'" role="tab" aria-selected="'+
    ((S.view===k||(S.view==="workout"&&k==="today"))?"true":"false")+'">'+esc(l)+'</button>').join("");
  document.querySelectorAll("#lang button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.l===S.lang?"true":"false"));
  const v=S.view==="guide"?viewGuide():S.view==="history"?viewHistory():S.view==="workout"?viewWorkout():viewToday();
  $("#app").innerHTML=v;
  renderDock();
  renderBanner();
  wireVideos();
}

/* ════════════════════════════════════════════════════════════════
   Actions
   ════════════════════════════════════════════════════════════════ */
function startWorkout(){
  const k=slotKey(S.cycleIndex);if(k==="rest")return;
  S.active={slot:slotNo(S.cycleIndex),dayKey:k,startedAt:Date.now(),e:blankEntries(k),cardio:{done:false,min:""}};
  S.view="workout";saveActive();render();window.scrollTo(0,0);
}
function finishWorkout(){
  const a=S.active;if(!a)return;
  const d=dayOf(a.dayKey),tt=totals(a);
  const id="s_"+a.startedAt;
  const rec={id:id,kind:"session",dayKey:a.dayKey,slot:a.slot,startedAt:a.startedAt,
    finishedAt:Date.now(),durationMs:Date.now()-a.startedAt,setsDone:tt.done,vol:Math.round(tt.vol),unit:S.unit,
    cardio:a.cardio,
    ex:d.ex.map((e,i)=>({n:e.n,w:(a.e[i]||{w:[]}).w,s:(a.e[i]||{s:[]}).s}))};
  S.sessions.unshift(rec);
  S.cycleIndex++;S.active=null;S.timer=null;S.view="today";
  saveState();
  render();window.scrollTo(0,0);
  const mins=Math.round(rec.durationMs/60000);
  modal(t("wrote"),
    '<div class="stats" style="margin-bottom:14px">'+
    '<div><div class="v">'+rec.setsDone+'</div><div class="k">'+esc(t("sets"))+'</div></div>'+
    '<div><div class="v">'+rec.vol.toLocaleString("en-US")+'</div><div class="k">'+esc(t("volume"))+' '+S.unit+'</div></div>'+
    '<div><div class="v">'+mins+'</div><div class="k">'+esc(t("minutes"))+'</div></div></div>'+
    C.closing[S.lang].map((p,n)=>'<p style="'+(n?"margin-top:9px":"")+'">'+esc(p)+'</p>').join(""));
}
function restDone(){S.cycleIndex++;saveState();render();window.scrollTo(0,0);}

/* ── backup ─────────────────────────────────────────────────────── */
function exportBackup(){
  const data={format:"argym-backup",v:1,exportedAt:new Date().toISOString(),
    state:{lang:S.lang,unit:S.unit,cycleIndex:S.cycleIndex,active:S.active,sessions:S.sessions}};
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="argym-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
/* sanitise one imported session: only known fields, numbers as numbers */
function cleanSession(s){
  if(!s||typeof s!=="object"||typeof s.id!=="string"||!isFinite(s.finishedAt))return null;
  const sets=a=>Array.isArray(a)?a.map(v=>({kg:String(v&&v.kg!=null?v.kg:""),r:String(v&&v.r!=null?v.r:""),d:!!(v&&v.d)})):[];
  return{id:s.id,kind:"session",dayKey:String(s.dayKey||""),slot:Number(s.slot)||0,
    startedAt:Number(s.startedAt)||0,finishedAt:Number(s.finishedAt),durationMs:Number(s.durationMs)||0,
    setsDone:Number(s.setsDone)||0,vol:Number(s.vol)||0,unit:String(s.unit||"kg"),
    cardio:{done:!!(s.cardio&&s.cardio.done),min:String(s.cardio&&s.cardio.min!=null?s.cardio.min:"")},
    ex:Array.isArray(s.ex)?s.ex.map(x=>({n:String(x&&x.n||""),w:sets(x&&x.w),s:sets(x&&x.s)})):[]};
}
async function importBackup(file){
  let data=null;
  try{data=JSON.parse(await file.text());}catch(e){}
  const st=data&&data.format==="argym-backup"&&data.state;
  if(!st||!Array.isArray(st.sessions)){modal(t("importb"),'<p>'+esc(t("importbad"))+'</p>');return;}
  const have=new Set(S.sessions.map(s=>s.id));
  const add=st.sessions.map(cleanSession).filter(s=>s&&!have.has(s.id));
  S.sessions=S.sessions.concat(add).sort((a,b)=>(b.finishedAt||0)-(a.finishedAt||0));
  if(Number.isInteger(st.cycleIndex)&&st.cycleIndex>S.cycleIndex)S.cycleIndex=st.cycleIndex;
  saveState();render();
  modal(t("imported"),'<p><b>'+add.length+'</b> '+esc(t("importedmsg"))+'</p>');
}

/* ── events ─────────────────────────────────────────────────────── */
document.addEventListener("click",ev=>{
  const T_=ev.target;
  const tab=T_.closest("[data-v]");
  if(tab){S.view=tab.dataset.v;closeModal();render();window.scrollTo(0,0);return;}
  const lg=T_.closest("#lang button");
  if(lg){S.lang=lg.dataset.l;saveState();render();return;}

  const act=T_.closest("[data-a]");
  if(act){
    const a=act.dataset.a;
    if(a==="closemodal"){if(T_.closest(".modal")&&T_.dataset.a!=="closemodal")return;closeModal();return;}
    if(a==="start"){startWorkout();return;}
    if(a==="go"){S.view="workout";render();window.scrollTo(0,0);return;}
    if(a==="finish"){finishWorkout();return;}
    if(a==="restdone"){restDone();return;}
    if(a==="skiprest"){S.timer=null;renderTimer();return;}
    if(a==="export"){exportBackup();return;}
    if(a==="import"){$("#importf").click();return;}
    if(a==="hidehint"){S.hintOff=true;saveState();renderBanner();return;}
    if(a==="update"){lsWrite();updateSW(true);return;}
  }
  const dlb=T_.closest("button[data-dl]");
  if(dlb){
    const k=dlb.dataset.dl;
    download(k,k==="all"?allSlugs():k==="intro"?[INTRO]:daySlugs(k));
    return;
  }
  const info=T_.closest("[data-i]");
  if(info){
    const k=info.dataset.i;
    if(k==="novid"){modal(t("novid"),'<p>'+esc(t("novidmsg"))+'</p>');return;}
    const g=C.gloss.items.find(x=>x.k===k);
    if(g)modal(g.t[S.lang],'<p>'+esc(g.d[S.lang])+'</p>');
    return;
  }
  const disc=T_.closest("[data-d]");
  if(disc){S.open[disc.dataset.d]=!S.open[disc.dataset.d];render();return;}
  const hist=T_.closest("[data-h]");
  if(hist){S.open[hist.dataset.h]=!S.open[hist.dataset.h];render();return;}

  /* opening a demo starts it — this click is the user gesture iOS wants */
  const pv=T_.closest("[data-pv]");
  if(pv){
    S.player=S.player===pv.dataset.pv?null:pv.dataset.pv;render();
    const v=S.player&&$(".player video");
    if(v){const p=v.play();if(p&&p.catch)p.catch(()=>{});}
    return;
  }

  /* Ticking a set updates in place — a full re-render would tear down
     an open player and restart the video mid-set. */
  const tick=T_.closest("button.tick[data-x]");
  if(tick&&S.active){
    const i=+tick.dataset.x,p=tick.dataset.p,j=+tick.dataset.j;
    const st=S.active.e[i][p][j];st.d=!st.d;
    if(st.d){
      const e=dayOf(S.active.dayKey).ex[i];
      if(!st.r){
        st.r=e.reps.split("-")[0];
        const inp=document.getElementById("f-"+p+i+"-"+j+"-r");
        if(inp)inp.value=st.r;
      }
      startTimer(e.n,e.sec);
    }
    tick.setAttribute("aria-pressed",st.d?"true":"false");
    const card=tick.closest(".ex"),en=S.active.e[i];
    if(card)card.classList.toggle("is-done",en.s.length>0&&en.s.every(s=>s.d));
    saveActive();renderDock();
    return;
  }
  const cd=T_.closest("button.tick[data-c]");
  if(cd&&S.active){S.active.cardio.done=!S.active.cardio.done;saveActive();render();}
});
document.addEventListener("input",ev=>{
  const el=ev.target;if(!S.active)return;
  if(el.dataset.c==="min"){S.active.cardio.min=el.value;saveActive();return;}
  if(el.dataset.x===undefined)return;
  const i=+el.dataset.x,p=el.dataset.p,j=+el.dataset.j,f=el.dataset.f;
  if(!S.active.e[i])return;
  S.active.e[i][p][j][f]=el.value;
  saveActive();
  if(S.view==="workout")renderDock();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
$("#importf").addEventListener("change",ev=>{
  const f=ev.target.files&&ev.target.files[0];
  ev.target.value="";
  if(f)importBackup(f);
});

/* ════════════════════════════════════════════════════════════════
   Service worker — offline shell, video cache, update prompt
   ════════════════════════════════════════════════════════════════ */
let swReg=null;
const updateSW=registerSW({
  immediate:true,
  /* a new version is waiting: offer it, never reload on our own */
  onNeedRefresh(){S.needRefresh=true;renderBanner();},
  onRegisteredSW(url,r){swReg=r||null;},
});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&swReg&&navigator.onLine)swReg.update().catch(()=>{});
});
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",ev=>{
    const m=ev.data||{};
    if(m.type==="VIDEO_CACHED"){
      const slug=(String(m.url).match(/\/videos\/([^/]+)\.mp4$/)||[])[1];
      if(slug){markCached(slug);refreshEstimate().then(renderOffline);}
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   Boot — render from local storage immediately
   ════════════════════════════════════════════════════════════════ */
(function boot(){
  const c=lsRead();
  if(c){S.lang=c.lang||"en";S.unit=c.unit||"kg";S.cycleIndex=c.cycleIndex||0;
        S.active=c.active||null;S.sessions=c.sessions||[];S.hintOff=!!c.hintOff;
        if(S.active)S.view="workout";}
  render();
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  Promise.all([scanCache(),refreshEstimate()]).then(()=>{
    S.cached.forEach(s=>markCached(s,true));
    renderOffline();
  });
})();
