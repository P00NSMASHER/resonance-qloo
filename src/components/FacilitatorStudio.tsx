import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STUDIO_MODE, STUDIO_VERSION, cleanPublicText, composeStudioSteps,
  applyDeclinedTopics, looksLikeContactInfo,
  createStudioPacket, safeImportStudioPacket, studioPacketToText,
  type PreferenceStatus, type StudioDuration, type StudioMode, type StudioPacket, type StudioSourceStep,
} from "../lib/studioLogic";
import styles from "./FacilitatorStudio.module.css";

type Props={
  plan:StudioSourceStep[];
  anchors:string[];
  preferenceStatuses:PreferenceStatus[];
  source:"qloo-live"|"illustrative-demo";
  durationMinutes:30|45|60;
  decisions:string[];
  edits?:Record<number,string>;
};
const PRIVATE_TAG_KEY="resonance.anonThemeFeedback.v1";
type PrivateTag={theme:string;tag:"used"|"skipped"|"worked";savedAt:number};
const clean=(value:string)=>cleanPublicText(value).slice(0,200);
function escapeHtml(s:string):string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function downloadBlob(filename:string,bytes:string,type:string) {
  const blob=new Blob([bytes],{type});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function offlineHtml(p:StudioPacket){
  const printable=studioPacketToText(p);
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Resonance offline facilitator plan</title><style>'+
    'body{font:16px/1.55 system-ui,sans-serif;color:#143c42;margin:0 auto;max-width:780px;padding:30px;background:#fff}'+
    'h1{font:34px Georgia,serif}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.65 system-ui,sans-serif}'+
    'button{padding:12px 18px;border:1px solid #456;cursor:pointer}'+
    '@media print{button{display:none}body{padding:10mm;font-size:12px}pre{font-size:11px}}'+
    '</style></head><body><h1>Resonance · facilitator handoff</h1>'+
    '<p>Self-contained. Opens without internet. Review current preferences and local rules before use.</p>'+
    '<button onclick="window.print()">Print / save as PDF</button><pre>'+
    escapeHtml(printable)+'</pre></body></html>';
}
function onePageHtml(p:StudioPacket){
  const rows=p.steps.map((step,i)=>
    '<section><h2>'+(i+1)+'. '+escapeHtml(step.title)+' · '+step.durationMinutes+' min</h2>'+
    '<p>'+escapeHtml(step.prompt)+'</p>'+
    '<p><strong>Access:</strong> '+escapeHtml(step.alternative)+'</p>'+
    '<p><strong>Zero-prop:</strong> '+escapeHtml(step.safeMaterials)+'</p></section>').join('');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
    '<title>Resonance one-page facilitator run sheet</title><style>'+
    '@page{size:A4;margin:11mm}body{margin:0;font:11px/1.35 system-ui;color:#123c42}'+
    'h1{font:24px Georgia;margin:0 0 6px}h2{font:16px Georgia;margin:0 0 5px}p{margin:4px 0}'+
    'section{border-top:1px solid #aaa;padding:8px 0;break-inside:avoid}.small{font-size:9px}'+
    'button{padding:10px 16px;margin-bottom:15px}@media print{button{display:none}}'+
    '</style></head><body><button onclick="window.print()">Print / save as PDF</button>'+
    '<h1>Resonance · one-page run sheet</h1><p>'+p.sessionMinutes+' min · source '+escapeHtml(p.source)+
    ' · '+escapeHtml(p.version)+'</p><p class="small">Ask first; let people pass or stop. No clinical advice. Confirm media rights and facility policies.</p>'+
    rows+'<p class="small">Self-contained offline file. Not evidence of improved outcomes. No person-specific Qloo attribution.</p></body></html>';
}
function readTags():PrivateTag[]{
  try {
    const saved=JSON.parse(localStorage.getItem(PRIVATE_TAG_KEY)||"[]");
    const cutoff=Date.now()-30*86400000;
    const kept=Array.isArray(saved)?saved.filter((x:PrivateTag)=>
      x && typeof x.theme==="string" && ["used","skipped","worked"].includes(x.tag) &&
      typeof x.savedAt==="number" && x.savedAt>cutoff).slice(-60):[];
    if(kept.length!==saved.length)localStorage.setItem(PRIVATE_TAG_KEY,JSON.stringify(kept));
    return kept;
  }catch{return [];}
}
export default function FacilitatorStudio({
  plan,anchors,preferenceStatuses,source,durationMinutes,decisions,edits={},
}:Props){
  const [expanded,setExpanded]=useState(false);
  const [mode,setMode]=useState<StudioMode>({...DEFAULT_STUDIO_MODE,duration:durationMinutes});
  const [consentAsked,setConsentAsked]=useState(false);
  const [currentStep,setCurrentStep]=useState(0);
  const [isRunning,setIsRunning]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [swapped,setSwapped]=useState<number[]>([]);
  const [note,setNote]=useState("");
  const [tags,setTags]=useState<PrivateTag[]>([]);
  const [imported,setImported]=useState<StudioPacket|null>(null);
  const [message,setMessage]=useState("");
  const fileRef=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{setTags(readTags());},[]);
  useEffect(()=>{setIsRunning(false);setCurrentStep(0);setElapsed(0);setSwapped([]);},[mode.duration]);
  useEffect(()=>{if(!isRunning)return;const id=window.setInterval(()=>setElapsed(n=>n+1),1000);return()=>window.clearInterval(id);},[isRunning]);
  useEffect(()=>{if(!consentAsked||preferenceStatuses.includes("declined"))setIsRunning(false);},[consentAsked,preferenceStatuses]);
  const steps=useMemo(()=>composeStudioSteps(plan,mode,anchors,source),[plan,mode,anchors,source]);
  const handoffSteps=useMemo(()=>applyDeclinedTopics(steps,swapped),[steps,swapped]);
  const packet=useMemo(()=>createStudioPacket({
    steps:handoffSteps,anchors,mode,source,decisions,edits,note,
  }),[handoffSteps,anchors,mode,source,decisions,edits,note]);
  const active=steps[Math.min(currentStep,Math.max(steps.length-1,0))];
  const statusText=preferenceStatuses.every(s=>s==="current")?
    "Favorites marked as current by the facilitator (not independently verified)." :
    preferenceStatuses.some(s=>s==="declined") ?
      "One favorite was declined: remove it before starting or share only an anchor-free topic." :
      "Some favorites are uncertain. Ask for current permission; do not present them as known personal tastes.";
  const updateMode=<K extends keyof StudioMode>(key:K,value:StudioMode[K])=>{
    setMode(previous=>({...previous,[key]:value}));
    setMessage("");
  };
  const exportPacket=(format:"json"|"txt"|"html"|"card")=>{
    if(looksLikeContactInfo(note)){
      setMessage("The note looks like it contains contact details. Remove them before exporting. This check cannot detect all private information.");
      return;
    }
    try{
      if(format==="json")downloadBlob("resonance-handoff-v1.json",JSON.stringify(packet,null,2),"application/json;charset=utf-8");
      if(format==="txt")downloadBlob("resonance-handoff-v1.txt",studioPacketToText(packet),"text/plain;charset=utf-8");
      if(format==="html")downloadBlob("resonance-offline-plan.html",offlineHtml(packet),"text/html;charset=utf-8");
      if(format==="card")downloadBlob("resonance-one-page-run-sheet.html",onePageHtml(packet),"text/html;charset=utf-8");
      setMessage(["html","card"].includes(format)?"Offline HTML downloaded. Open without internet; print or Save as PDF after reviewing the layout.":"Versioned plan downloaded; share the file deliberately.");
    }catch{setMessage("File download was blocked. Use the existing Copy session fallback above.");}
  };
  const recordTag=(theme:string,tag:PrivateTag["tag"])=>{
    const safe=clean(theme||"theme").slice(0,90);
    if(!safe)return;
    const next=[...tags,{theme:safe,tag,savedAt:Date.now()}].slice(-60);
    try{localStorage.setItem(PRIVATE_TAG_KEY,JSON.stringify(next));setTags(next);setMessage("Saved an anonymous theme tag on this device only (30-day retention).");}
    catch{setMessage("Browser storage is unavailable. No feedback was saved.");}
  };
  const clearTags=()=>{
    try{localStorage.removeItem(PRIVATE_TAG_KEY);setTags([]);setMessage("Local theme feedback deleted.");}
    catch{setMessage("Could not clear local storage on this browser.");}
  };
  const importFile=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>120000){setMessage("Handoff too large; import a Resonance JSON packet under 120 KB.");return;}
    try {
      const parsed=JSON.parse(await file.text());
      const valid=safeImportStudioPacket(parsed);
      if(!valid){setMessage("Not a compatible, valid Resonance facilitator handoff.");return;}
      setImported(valid);setMessage("Versioned plan opened locally. No information was sent to a server.");
    }catch{setMessage("Invalid JSON file. Nothing was imported.");}
    finally{if(fileRef.current)fileRef.current.value="";}
  };
  return <section className={styles.shell} aria-label="Facilitator Studio">
    <div className={styles.titleRow}>
      <div><p className={styles.eyebrow}>FACILITATOR STUDIO · v1</p><h3>Adapt this plan to today’s preferences and abilities.</h3>
        <p>Optional adaptations are written by Resonance, not endorsed by Qloo. Human consent and facility policy govern actual use.</p></div>
      <button type="button" className={styles.openButton} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>
        {expanded?"Close adaptations":"Open facilitator adaptations"}
      </button>
    </div>
    {expanded&&<div className={styles.content}>
      <section className={styles.safety} aria-labelledby="studio-choices">
        <h4 id="studio-choices">Person-led consent and safety</h4>
        <p>{statusText}</p>
        <label className={styles.consent}><input type="checkbox" checked={consentAsked} onChange={e=>setConsentAsked(e.target.checked)}/>
          I will ask before starting, allow refusal, check local facility requirements, and stop or switch topics immediately if requested.
        </label>
        <p>No clinical, swallowing, medication, mobility, or diet decisions are provided. All content may be declined without explanation. Avoid assuming a topic remains enjoyable because it was once popular.</p>
      </section>
      <section className={styles.settings} aria-label="Session customizations">
        <h4>Step 1 — choose duration, access and language</h4>
        <div className={styles.fields}>
          <label>Adapted length
            <select value={mode.duration} onChange={e=>updateMode("duration",Number(e.target.value) as StudioDuration)}>
              {([5,10,15,30,45,60] as StudioDuration[]).map(n=><option key={n} value={n}>{n} minutes {n<30?"· short visit":""}</option>)}
            </select>
          </label>
          <label>Facilitator cue language
            <select value={mode.language} onChange={e=>updateMode("language",e.target.value as "en"|"es")}>
              <option value="en">English</option><option value="es">Español · draft cues</option>
            </select>
          </label>
        </div>
        <p className={styles.caveat}>{mode.duration!==durationMinutes? `Locally adapted from the original ${durationMinutes}-minute Qloo plan. No new Qloo query or evidence was created.` : "Original planned length preserved."} Spanish templates need native-speaker review; source names and Qloo genres are never silently translated.</p>
        <div className={styles.switches}>
          {([
            ["lowStim","Low stimulation"],["audioOff","Audio off / captions or text"],["textFirst","Text first / large print"],
            ["highContrast","High contrast"],["aac","AAC / pointing / eye gaze"],["seated","Seated / no movement"],
            ["noEquipment","No equipment"],["noFood","No food or drink"],["mixedGroup","Two opt-in group tracks"],
          ] as [keyof StudioMode,string][]).map(([key,label])=><label key={key} className={styles.switch}>
            <input type="checkbox" checked={Boolean(mode[key])} onChange={e=>updateMode(key,e.target.checked as never)}/>
            {label}
          </label>)}
        </div>
        <p className={styles.caveat}>Quiet, seated, no-food, and zero-prop options are on by default. For licensed content, use only authorized excerpts or the description-only alternative. No media is supplied by Resonance.</p>
        <p><a href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image" target="_blank" rel="noreferrer">Find materials on Wikimedia Commons (verify each item's license)</a> · All steps also work without any media.</p>
      </section>
      <section className={mode.highContrast?styles.highContrast:styles.steps} aria-label="Adapted activities">
        <h4>Step 2 — run a person-led session</h4>
        <p>Offer two choices. Never require autobiographical recall, speech, movement, eye contact, or a personal explanation.</p>
        {!consentAsked&&<div className={styles.safetyNotice} role="note">Before starting the optional pacing timer, acknowledge the consent and facility-policy check above.</div>}
        <div className={styles.timer}>
          <span>{steps.length} steps · {steps.reduce((total,item)=>total+item.durationMinutes,0)} minutes planned</span>
          <strong aria-live="off">{String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</strong>
          <button type="button" disabled={!consentAsked||preferenceStatuses.includes("declined")} onClick={()=>setIsRunning(s=>!s)}>{isRunning?"Pause":"Start / resume"}</button>
          <button type="button" onClick={()=>{setIsRunning(false);setElapsed(0);setCurrentStep(0)}}>Reset</button>
        </div>
        {steps.map((step,index)=>{
          const visibleStep=handoffSteps[index]??step;
          const repeated=tags.some(t=>t.theme===clean(step.sourceTheme).slice(0,90)&&t.tag==="skipped");
          return <article key={step.index} className={styles.stepCard} aria-current={currentStep===index?"step":undefined}>
            <div className={styles.stepHeading}><b>{index+1}. {step.title}</b><span>{step.durationMinutes} min</span></div>
            {repeated&&<p className={styles.caveat}>A similar theme was previously skipped on this device. Ask before repeating it.</p>}
            <p className={styles.intro}>{visibleStep.intro}</p>
            <p><b>Ask:</b> {visibleStep.prompt}</p>
            <p><b>Accessible alternative:</b> {visibleStep.alternative}</p>
            <p><b>Materials:</b> {visibleStep.safeMaterials}</p>
            <p><b>Permission:</b> {visibleStep.permission}</p>
            {mode.mixedGroup&&<div className={styles.tracks}><p>{visibleStep.trackA}</p><p>{visibleStep.trackB}</p><p className={styles.caveat}>Let people opt into a track; do not divide people based on assumed tastes or conditions.</p></div>}
            <details><summary>Original Qloo-informed source &amp; rationale (for review)</summary><p>{step.sourceAction}</p><p>{step.sourceWhy}</p><p>{step.sourceTheme}</p>{edits[step.index]&&<p><strong>Separate facilitator edit (not Qloo verified):</strong> {edits[step.index]}</p>}</details>
            <div className={styles.controls}>
              <button type="button" onClick={()=>{setSwapped(v=>v.includes(step.index)?v:[...v,step.index]);setIsRunning(false);setCurrentStep(index);}}>Pass / switch topic</button>
              <button type="button" onClick={()=>{setCurrentStep(Math.min(index+1,steps.length-1));setElapsed(0);}}>Next step</button>
              <button type="button" onClick={()=>recordTag(step.sourceTheme,"worked")}>Worked</button>
              <button type="button" onClick={()=>recordTag(step.sourceTheme,"skipped")}>Skipped</button>
            </div>
          </article>;
        })}
      </section>
      <section className={styles.handoff} aria-label="Share-safe handoff">
        <h4>Step 3 — save an offline, versioned handoff</h4>
        <p>Only generic cultural favorites and your choices are included. Downloads leave this app's control; do not add participant names, diagnoses, addresses, or protected records. There is no access-controlled staff portal.</p>
        <label>Optional non-identifying handoff note (max 280 characters)
          <textarea maxLength={280} value={note} onChange={e=>setNote(e.target.value)} placeholder="Example: Quiet room; use two text choices; offer a pause." />
        </label>
        <div className={styles.controls}>
          <button type="button" onClick={()=>exportPacket("txt")}>Download TXT</button>
          <button type="button" onClick={()=>exportPacket("html")}>Download complete offline plan</button>
          <button type="button" onClick={()=>exportPacket("card")}>One-page run sheet / PDF-ready</button>
          <button type="button" onClick={()=>exportPacket("json")}>Download versioned JSON</button>
        </div>
        <p className={styles.caveat}>Offline HTML opens without internet and includes Print / Save as PDF. Generating NEW Qloo recommendations still requires a verified internet connection. Live Qloo status is never simulated offline.</p>
        <label>Open a previously exported handoff on another device
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={e=>void importFile(e.target.files?.[0])}/>
        </label>
        {imported&&<details open><summary>Imported unverified {imported.sessionMinutes}-minute packet · declared source {imported.source}</summary>
          <p className={styles.caveat}>Imported JSON can be edited by anyone and does not authenticate the Qloo source. Confirm favorites, consent and policies before use.</p>
          <textarea readOnly value={studioPacketToText(imported)} rows={8} onFocus={e=>e.currentTarget.select()} aria-label="Imported handoff text"/>
        </details>}
        <div className={styles.controls}>
          <button type="button" onClick={clearTags}>Delete local theme feedback</button>
          <a href="/study">Help test genuine added value: voluntary research study</a>
        </div>
        <p>Simulated reviewer feedback is not real participant evidence; the original unfavorable synthetic plan comparison is retained. No superiority claim is made.</p>
      </section>
      {message&&<p className={styles.message} role="status">{message}</p>}
    </div>}
  </section>;
}



