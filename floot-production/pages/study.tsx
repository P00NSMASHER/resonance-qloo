import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "../components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Textarea } from "../components/Textarea";
import { postStudyResponse, STUDY_ROLES, STUDY_VERSION, type InputType } from "../endpoints/study-response_POST.schema";
import styles from "./study.module.css";

const roleLabels:Record<(typeof STUDY_ROLES)[number],string> = {
  "activity-director":"Activity / life-enrichment director",
  "activity-assistant":"Activity assistant",
  "family-caregiver":"Family caregiver",
  "recreation-staff":"Recreation / engagement staff",
  "assisted-living-staff":"Assisted-living staff",
  "other-adjacent":"Other adjacent role",
};

const ratingLabels = ["","Very low","Low","Moderate","High","Very high"];

export default function StudyPage() {
  const [responseId] = useState(() => crypto.randomUUID());
  const [role,setRole] = useState<InputType["role"]|null>(null);
  const [baselineStart,setBaselineStart] = useState<number|null>(null);
  const [baselineSeconds,setBaselineSeconds] = useState<number|null>(null);
  const [resonanceStart,setResonanceStart] = useState<number|null>(null);
  const [resonanceSeconds,setResonanceSeconds] = useState<number|null>(null);
  const [relevance,setRelevance] = useState(0);
  const [novelty,setNovelty] = useState(0);
  const [usefulness,setUsefulness] = useState(0);
  const [wouldUse,setWouldUse] = useState<boolean|null>(null);
  const [feedback,setFeedback] = useState("");
  const [consent,setConsent] = useState(false);
  const [submitting,setSubmitting] = useState(false);
  const [submitted,setSubmitted] = useState(false);
  const [receipt,setReceipt] = useState<InputType|null>(null);
  const [error,setError] = useState("");

  const ready = useMemo(() =>
    Boolean(role && baselineSeconds !== null && resonanceSeconds !== null && relevance && novelty && usefulness && wouldUse !== null && feedback.trim().length >= 3 && consent),
    [role,baselineSeconds,resonanceSeconds,relevance,novelty,usefulness,wouldUse,feedback,consent]
  );

  function finishTimer(start:number|null,setter:(value:number)=>void,min:number,max:number) {
    if (!start) return;
    setter(Math.max(min,Math.min(max,Math.round((Date.now()-start)/1000))));
  }

  async function submit() {
    if (!ready || !role || baselineSeconds === null || resonanceSeconds === null || wouldUse === null) return;
    setSubmitting(true); setError("");
    try {
      const output=await postStudyResponse({
        studyVersion:STUDY_VERSION,responseId,role,baselineSeconds,resonanceSeconds,relevance,novelty,usefulness,wouldUse,
        feedback:feedback.trim(),consent:true,
      });
      setReceipt(output.receipt);
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit the study response.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadReceipt() {
    if (!receipt) return;
    const blob=new Blob([`${JSON.stringify(receipt)}\n`],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`resonance-study-${receipt.responseId}.json`;
    link.click(); URL.revokeObjectURL(url);
  }

  if (submitted) return <>
    <Helmet><title>Resonance validation study — thank you</title><meta name="robots" content="noindex,nofollow"/></Helmet>
    <main className={styles.page}><section className={styles.thanks}><span>Anonymous receipt ready</span><h1>Thank you.</h1><p>Your timing and rating metrics were accepted. To keep your open comment out of server logs, download this anonymous receipt and give it directly to the study facilitator. It contains only the fields you reviewed below—no name, email, network address, resident/client information, or health data.</p><Button onClick={downloadReceipt} disabled={!receipt}>Download anonymous study receipt</Button><p><small>Your response is not counted as real-user evidence until the facilitator receives and validates this receipt.</small></p></section></main>
  </>;

  return <>
    <Helmet><title>Resonance validation study</title><meta name="robots" content="noindex,nofollow"/><meta name="description" content="Anonymous target-user validation for Resonance."/></Helmet>
    <main className={styles.page}>
      <header><a href="/">Resonance</a><span>Anonymous validation study</span></header>
      <section className={styles.hero}><span>About 8–12 minutes</span><h1>Help us test whether Resonance actually improves activity planning.</h1><p>This study is for activity/life-enrichment staff, recreation/engagement staff, assisted-living staff, or family caregivers. Please do not enter anyone’s name, contact information, health information, or resident/client details.</p></section>

      <section className={styles.card}><span className={styles.step}>01 · Your role</span><h2>Which perspective are you testing from?</h2><Select value={role ?? undefined} onValueChange={value=>setRole(value as InputType["role"])}><SelectTrigger><SelectValue placeholder="Choose a role"/></SelectTrigger><SelectContent>{STUDY_ROLES.map(value=><SelectItem key={value} value={value}>{roleLabels[value]}</SelectItem>)}</SelectContent></Select></section>

      <section className={styles.card}><span className={styles.step}>02 · Baseline</span><h2>Plan it without Resonance.</h2><p>Imagine you need a <b>30-minute calm small-group engagement session</b> where the only known favorites are <b>Ella Fitzgerald</b> and <b>Roman Holiday</b>.</p><p>Create a usable four-part plan using your normal approach. For this baseline, do not use Resonance or another AI tool. You can think, type notes elsewhere, or write on paper.</p><div className={styles.timerRow}><Button disabled={baselineStart!==null && baselineSeconds===null} onClick={()=>{setBaselineSeconds(null);setBaselineStart(Date.now())}}>Start baseline timer</Button><Button variant="outline" disabled={!baselineStart || baselineSeconds!==null} onClick={()=>finishTimer(baselineStart,setBaselineSeconds,15,3600)}>I have a usable plan</Button><strong>{baselineSeconds===null ? baselineStart ? "Timer running…" : "Not started" : `${baselineSeconds}s`}</strong></div></section>

      <section className={styles.card}><span className={styles.step}>03 · Resonance</span><h2>Do the same task with Resonance.</h2><p>The live app opens with the exact same favorites and 30-minute calm small-group context. Click <b>Build with live Qloo</b>, review the result, and stop the timer when you have a plan you could actually use or adapt.</p><div className={styles.timerRow}><Button disabled={resonanceStart!==null && resonanceSeconds===null} onClick={()=>{setResonanceSeconds(null);setResonanceStart(Date.now());window.open("/","_blank","noopener,noreferrer")}}>Start timer & open Resonance</Button><Button variant="outline" disabled={!resonanceStart || resonanceSeconds!==null} onClick={()=>finishTimer(resonanceStart,setResonanceSeconds,5,1800)}>I have a usable plan</Button><strong>{resonanceSeconds===null ? resonanceStart ? "Timer running…" : "Not started" : `${resonanceSeconds}s`}</strong></div></section>

      <section className={styles.card}><span className={styles.step}>04 · Rate the result</span><h2>How useful was the Resonance plan?</h2><div className={styles.ratingGrid}>{[["Relevance",relevance,setRelevance],["Novelty",novelty,setNovelty],["Confidence / usefulness",usefulness,setUsefulness]].map(([label,value,setter])=><label key={label as string}><span>{label as string}</span><Select value={value ? String(value) : undefined} onValueChange={v=>(setter as (n:number)=>void)(Number(v))}><SelectTrigger><SelectValue placeholder="1–5"/></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n=><SelectItem key={n} value={String(n)}>{n} — {ratingLabels[n]}</SelectItem>)}</SelectContent></Select></label>)}</div><div className={styles.useRow}><span>Would you use something like this in real planning?</span><Button variant={wouldUse===true?"primary":"outline"} onClick={()=>setWouldUse(true)}>Yes</Button><Button variant={wouldUse===false?"primary":"outline"} onClick={()=>setWouldUse(false)}>No</Button></div><label className={styles.feedback}><span>What would make this genuinely useful to you?</span><Textarea rows={5} maxLength={500} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Please do not include names, emails, phone numbers, resident/client details, or health information."/></label></section>

      <section className={styles.card}><span className={styles.step}>05 · Anonymous aggregate use</span><h2>Consent</h2><p>Your role category, two elapsed times, ratings, and yes/no reuse intent are recorded without a raw network address. Your open comment is withheld from server logs and returned only in a downloadable anonymous receipt for you to give directly to the study facilitator. No name, email, resident/client information, or health data is requested.</p><Button variant={consent?"primary":"outline"} aria-pressed={consent} onClick={()=>setConsent(v=>!v)}>{consent?"✓ I consent to anonymous aggregate use":"I consent to anonymous aggregate use"}</Button>{error && <div className={styles.error} role="alert">{error}</div>}<Button className={styles.submit} disabled={!ready||submitting} onClick={()=>void submit()}>{submitting?"Submitting…":"Create anonymous study receipt"}</Button></section>
      <footer>Study version {STUDY_VERSION} · Cultural-engagement workflow research only · no medical advice.</footer>
    </main>
  </>;
}
