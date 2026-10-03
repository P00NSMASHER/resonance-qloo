import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import {
  AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, Copy,
  Film, HeartHandshake, Music2, Plus, Printer, RefreshCw,
  ShieldCheck, Sparkles, Trash2, Users, Utensils,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Badge } from "../components/Badge";
import styles from "./_index.module.css";
import {
  postRecommend, QlooReviewRequiredError,
  type OutputType, type RequestContext, type ResolvedAnchor,
} from "../endpoints/recommend_POST.schema";
import { getStatus, type OutputType as StatusType } from "../endpoints/status_GET.schema";
import { qlooSessionLogic } from "../helpers/qlooSessionLogic";

type AnchorType = "any"|"artist"|"movie"|"book"|"brand"|"destination"|"place"|"podcast"|"tv_show"|"videogame";
type AnchorDraft = { query:string; type:AnchorType };
type RichResult = OutputType & {
  requestContext:RequestContext;
  evidence:NonNullable<OutputType["evidence"]>;
  provenance:NonNullable<OutputType["provenance"]>;
  agentTrace:NonNullable<OutputType["agentTrace"]>;
};

const anchorTypes:{ value:AnchorType; label:string }[] = [
  {value:"any",label:"Any category"},{value:"artist",label:"Artist"},{value:"movie",label:"Film"},
  {value:"book",label:"Book"},{value:"brand",label:"Brand"},{value:"destination",label:"Destination"},
  {value:"place",label:"Place"},{value:"podcast",label:"Podcast"},{value:"tv_show",label:"TV show"},
  {value:"videogame",label:"Video game"},
];
const initialAnchors:AnchorDraft[] = [
  { query:"Ella Fitzgerald", type:"artist" },
  { query:"Singin' in the Rain", type:"movie" },
  { query:"Italian food", type:"any" },
];

const demoResult:RichResult = {
  requestContext:{
    anchors:[
      {query:"Ella Fitzgerald",typeUrn:"urn:entity:artist"},
      {query:"Singin' in the Rain",typeUrn:"urn:entity:movie"},
      {query:"Italian food"},
    ],
    energy:"calm",setting:"small-group",durationMinutes:45,
  },
  summary:"Illustrative preview only — this is not live Qloo data.",
  resolvedAnchors:[
    {query:"Ella Fitzgerald",name:"Ella Fitzgerald",entityId:"demo:ella",urn:"demo:ella",requestedTypeUrn:"urn:entity:artist",resolutionMatch:"exact-name"},
    {query:"Singin' in the Rain",name:"Singin' in the Rain",entityId:"demo:rain",urn:"demo:rain",requestedTypeUrn:"urn:entity:movie",resolutionMatch:"exact-name"},
    {query:"Italian food",name:"Italian cuisine",entityId:"demo:italian",urn:"demo:italian",resolutionMatch:"top-result"},
  ],
  affinities:[
    {label:"classic jazz vocals",score:null,rank:1},
    {label:"Golden Age musicals",score:null,rank:2},
    {label:"mid-century elegance",score:null,rank:3},
    {label:"Italian-American comfort",score:null,rank:4},
  ],
  plan:[
    {title:"Opening cue",duration:"10 min",action:"Open with a familiar Ella Fitzgerald track and invite a low-pressure choice between two songs.",why:"Illustrative rationale showing how a known favorite can connect to an adjacent cultural signal.",anchorName:"Ella Fitzgerald",affinityLabel:"classic jazz vocals"},
    {title:"Story bridge",duration:"10 min",action:"Use a classic musical prompt to invite stories about theaters, dancing, or favorite performers.",why:"Illustrative rationale showing a film-to-musical cultural bridge.",anchorName:"Singin' in the Rain",affinityLabel:"Golden Age musicals"},
    {title:"Shared choice",duration:"15 min",action:"Offer adjacent prompts across music, fashion, or travel and let the group choose.",why:"Illustrative rationale preserving participant choice while branching into adjacent culture.",anchorName:"Italian cuisine",affinityLabel:"mid-century elegance"},
    {title:"Closing ritual",duration:"10 min",action:"Close around an Italian comfort-food prompt and ask what should return next time.",why:"Illustrative rationale for ending in the same cultural neighborhood.",affinityLabel:"Italian-American comfort"},
  ],
  agentTrace:[
    {stage:"resolve",status:"warning",detail:"Illustrative: two anchors are exact-name matches; “Italian food” resolves to the example top result “Italian cuisine,” which should be reviewed."},
    {stage:"evaluate",status:"ok",detail:"Illustrative: preserve the first four ranked signals without manufacturing percentages."},
    {stage:"compose",status:"ok",detail:"Illustrative: adapt four activities to the selected session context."},
    {stage:"explain",status:"ok",detail:"Illustrative: attach a visible rationale to every activity."},
  ],
  evidence:{
    meanNormalizedScore:null,evidenceBasis:"ranked-order",selectedAffinityCount:4,returnedAffinityCount:4,
    selectedAffinityLabels:["classic jazz vocals","Golden Age musicals","mid-century elegance","Italian-American comfort"],
    resolvedAnchorCount:3,exactResolutionCount:2,topResultResolutionCount:1,categoryHintCount:2,
    explainabilityResultCount:0,aggregateExplainabilityAvailable:false,sessionDurationMinutes:45,
    energy:"calm",setting:"small-group",
  },
  provenance:{
    source:"illustrative-demo",apiOrigin:qlooSessionLogic.apiOrigin,
    contractVersion:qlooSessionLogic.contractVersion,generatedAt:"",
  },
};

function normalized(value:string) {
  return value.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("en-US");
}

function requestMatches(actual:RequestContext|undefined, expected:RequestContext) {
  if (!actual || actual.energy !== expected.energy || actual.setting !== expected.setting || actual.durationMinutes !== expected.durationMinutes) return false;
  if (!Array.isArray(actual.anchors) || actual.anchors.length !== expected.anchors.length) return false;
  return actual.anchors.every((item,index) =>
    normalized(item.query) === normalized(expected.anchors[index].query) &&
    (item.typeUrn ?? undefined) === (expected.anchors[index].typeUrn ?? undefined)
  );
}

function literalBaselineAction(query:string,typeUrn?:string) {
  switch (typeUrn) {
    case "urn:entity:artist": return `Use “${query}” directly: play or discuss something familiar from that artist and invite a response.`;
    case "urn:entity:movie":
    case "urn:entity:tv_show": return `Use “${query}” directly: revisit a scene, image, character, or memory connected to it.`;
    case "urn:entity:book": return `Use “${query}” directly: revisit a passage, cover, character, or memory connected to the book.`;
    case "urn:entity:place":
    case "urn:entity:destination": return `Use “${query}” directly: look at imagery from the place and invite travel or place-based memories.`;
    case "urn:entity:brand": return `Use “${query}” directly: use the familiar brand, object, or design as a concrete conversation prompt.`;
    case "urn:entity:podcast": return `Use “${query}” directly: discuss a familiar episode, host, or topic already associated with it.`;
    case "urn:entity:videogame": return `Use “${query}” directly: revisit a familiar game element, character, or play memory.`;
    default: return `Use “${query}” directly as a familiar conversation, image, music, food, or sensory prompt.`;
  }
}

function qlooDelta(result:RichResult) {
  const inputNames = result.requestContext.anchors.map(item => normalized(item.query));
  const selected = result.evidence.selectedAffinityLabels;
  const selectedSet = new Set(selected);
  return {
    baseline:result.requestContext.anchors.map(item => ({
      anchor:item.query,
      action:literalBaselineAction(item.query,item.typeUrn),
    })),
    inputAnchorCount:result.requestContext.anchors.length,
    returnedSignalCount:result.affinities.length,
    selectedSignalCount:selected.length,
    activitiesInfluencedCount:result.plan.filter(item => Boolean(item.affinityLabel && selectedSet.has(item.affinityLabel))).length,
    selectedSignalsNotNamedInInputs:selected.filter(label => {
      const n = normalized(label);
      return !inputNames.some(input => input === n || input.includes(n) || n.includes(input));
    }),
  };
}

function isRichLiveResult(value:OutputType, expected:RequestContext, status:StatusType|null): value is RichResult {
  if (!value.requestContext || !value.evidence || !value.provenance || !value.agentTrace) return false;
  if (!requestMatches(value.requestContext,expected)) return false;
  if (
    value.provenance.source !== "qloo-live" ||
    value.provenance.apiOrigin !== qlooSessionLogic.apiOrigin ||
    value.provenance.apiOrigin !== status?.qlooApiOrigin ||
    value.provenance.contractVersion !== qlooSessionLogic.contractVersion ||
    value.provenance.contractVersion !== status?.contractVersion ||
    !Number.isFinite(Date.parse(value.provenance.generatedAt))
  ) return false;
  if (
    value.evidence.returnedAffinityCount !== value.affinities.length ||
    value.evidence.selectedAffinityLabels.length !== value.evidence.selectedAffinityCount ||
    value.plan.length !== 4 ||
    value.agentTrace.map(step => step.stage).join("|") !== "resolve|evaluate|compose|explain"
  ) return false;
  const labels = new Set(value.affinities.map(item => item.label));
  return value.evidence.selectedAffinityLabels.every(label => labels.has(label));
}

export default function HomePage() {
  const [anchors,setAnchors] = useState<AnchorDraft[]>(initialAnchors);
  const [energy,setEnergy] = useState<"calm"|"social"|"active">("calm");
  const [setting,setSetting] = useState<"one-on-one"|"small-group"|"community">("small-group");
  const [durationMinutes,setDurationMinutes] = useState<30|45|60>(45);
  const [status,setStatus] = useState<StatusType|null>(null);
  const [checkingStatus,setCheckingStatus] = useState(true);
  const [result,setResult] = useState<RichResult|null>(null);
  const [source,setSource] = useState<"live"|"demo"|null>(null);
  const [review,setReview] = useState<{ anchors:ResolvedAnchor[]; token:string; context:RequestContext }|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const [copied,setCopied] = useState(false);
  const resultRef = useRef<HTMLElement|null>(null);

  const usableAnchors = useMemo(() => anchors
    .map(item => ({...item,query:item.query.trim()}))
    .filter(item => item.query.length >= 2),[anchors]);
  const contractMatches = status?.contractVersion === qlooSessionLogic.contractVersion;
  const qlooReady = Boolean(
    status?.qlooConnected &&
    status.qlooStatus === "ready" &&
    status.qlooApiOrigin === qlooSessionLogic.apiOrigin &&
    contractMatches
  );
  const canRun = usableAnchors.length >= 2 && qlooReady && !loading;

  async function refreshStatus(force = false) {
    setCheckingStatus(true);
    try {
      setStatus(await getStatus(force));
    } catch {
      setStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  }

  useEffect(() => { void refreshStatus(); },[]);
  useEffect(() => {
    if (result) window.requestAnimationFrame(() => resultRef.current?.focus());
  },[result]);

  function invalidate() {
    setResult(null); setSource(null); setReview(null); setError(""); setCopied(false);
  }
  function changeAnchor(index:number,query:string) {
    invalidate(); setAnchors(current => current.map((item,i) => i === index ? {...item,query} : item));
  }
  function changeAnchorType(index:number,type:AnchorType) {
    invalidate(); setAnchors(current => current.map((item,i) => i === index ? {...item,type} : item));
  }
  function addAnchor() {
    if (anchors.length >= 4) return;
    invalidate(); setAnchors(current => [...current,{query:"",type:"any"}]);
  }
  function removeAnchor(index:number) {
    if (anchors.length <= 2) return;
    invalidate(); setAnchors(current => current.filter((_,i) => i !== index));
  }

  function currentRequestContext():RequestContext {
    return {
      anchors:usableAnchors.map(item => {
        const typeUrn = qlooSessionLogic.anchorTypeUrn(item.type);
        return {query:item.query,...(typeUrn ? {typeUrn} : {})};
      }),
      energy,setting,durationMinutes,
    };
  }

  async function runLive(confirmedEntityIds:string[] = [], reviewToken = "") {
    if (!canRun) return;
    setLoading(true); setError(""); setResult(null); setSource(null);
    const expected = currentRequestContext();
    if (!confirmedEntityIds.length) setReview(null);
    try {
      const data = await postRecommend({
        anchors:usableAnchors.map(item => ({query:item.query,type:item.type})),
        energy,setting,durationMinutes,
        ...(confirmedEntityIds.length ? {confirmedEntityIds} : {}),
        ...(reviewToken ? {reviewToken} : {}),
      });
      if (!isRichLiveResult(data,expected,status)) {
        setStatus(current => current ? {...current,qlooConnected:false,qlooStatus:"degraded",mode:"preview"} : current);
        throw new Error("Live Qloo response failed its request/provenance consistency checks. Retry Qloo verification.");
      }
      setReview(null); setResult(data); setSource("live");
    } catch (reason) {
      if (reason instanceof QlooReviewRequiredError) {
        const candidate = reason.review;
        if (
          candidate.contractVersion !== qlooSessionLogic.contractVersion ||
          !requestMatches(candidate.requestContext,expected) ||
          !Array.isArray(candidate.resolvedAnchors) ||
          candidate.reviewToken.length > 128
        ) {
          setStatus(current => current ? {...current,qlooConnected:false,qlooStatus:"degraded",mode:"preview"} : current);
          setError("Qloo review response did not match this deployment/session. Retry Qloo verification.");
        } else {
          setReview({anchors:candidate.resolvedAnchors,token:candidate.reviewToken,context:candidate.requestContext});
        }
      } else {
        setError(reason instanceof Error ? reason.message : "Could not run the cultural agent.");
      }
    } finally {
      setLoading(false);
    }
  }

  function previewDemo() {
    invalidate();
    setAnchors(initialAnchors);
    setEnergy("calm"); setSetting("small-group"); setDurationMinutes(45);
    setResult(demoResult); setSource("demo");
  }

  async function copySession() {
    if (!result) return;
    const selected = result.evidence.selectedAffinityLabels;
    const signalOrder = new Map(selected.map((label,index) => [label,index + 1]));
    const lines = [
      "Resonance session",
      source === "live" ? "Source: Live Qloo" : "Source: Illustrative demo — not live Qloo data",
      `Deployment contract: ${result.provenance.contractVersion}`,
      `Qloo API origin: ${result.provenance.apiOrigin}`,
      `Request receipt: ${result.requestContext.anchors.map(item => item.query).join(" | ")}; ${result.requestContext.energy}; ${result.requestContext.setting}; ${result.requestContext.durationMinutes} min`,
      "Interpretation limit: Qloo affinities are aggregate cultural relationships, not probabilities or claims about an individual.",
      "",
      "Resolved anchors:",
      ...result.resolvedAnchors.map(item => `- ${item.query} -> ${item.name} [${item.resolutionMatch}] {${source === "live" ? "Qloo" : "Demo"} ID: ${item.entityId}}`),
      "",
      "Taste evidence:",
      ...result.affinities.map(item => {
        const n = signalOrder.get(item.label);
        return `- [${n ? `Plan signal #${n}` : "Additional evidence"}] ${item.label}: ${item.score === null ? `Rank #${item.rank ?? "—"}` : `${Math.round(item.score*100)}%`}`;
      }),
      "",
      "Session plan:",
      ...result.plan.flatMap((item,index) => [
        `${index+1}. ${item.title} (${item.duration})`,
        `   ${item.action}`,
        `   Why it fits: ${item.why}`,
      ]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true); window.setTimeout(() => setCopied(false),1800);
    } catch {
      setError("Copy failed. You can still print the session.");
    }
  }

  const statusLabel = checkingStatus ? "Checking Qloo…" :
    qlooReady ? "Live Qloo verified" :
    status?.qlooStatus === "rate-limited" ? "Qloo temporarily rate-limited" :
    status?.qlooStatus === "degraded" ? "Qloo verification needs attention" :
    status && !contractMatches ? "Deployment contract mismatch" :
    "Qloo access pending";
  const selectedSequence = result?.evidence.selectedAffinityLabels ?? [];
  const selectedSet = new Set(selectedSequence);
  const selectedOrder = new Map(selectedSequence.map((label,index) => [label,index+1]));
  const delta = result ? qlooDelta(result) : null;

  return <>
    <Helmet>
      <title>Resonance — Qloo-powered cultural engagement agent</title>
      <meta name="description" content="Turn cultural favorites into a Qloo-grounded, explainable engagement session." />
    </Helmet>
    <main className={styles.page} data-deployment-contract={qlooSessionLogic.contractVersion}>
      <header className={styles.nav}>
        <div className={styles.brand}><span className={styles.brandMark}>R</span><span>Resonance</span></div>
        <div className={styles.navRight}>
          <Badge>Qloo Agent Hackathon</Badge>
          <span className={qlooReady ? styles.liveDot : styles.pendingDot}><i />{statusLabel}</span>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.eyebrow}><Sparkles size={15}/> Cultural intelligence for human connection</div>
        <h1>Turn what someone loves into a moment that feels <em>like them.</em></h1>
        <p className={styles.heroCopy}>Resonance turns a few known cultural favorites into an explainable engagement session. Qloo supplies the cross-category evidence; the agent selects, composes, and exposes the path instead of hiding it.</p>
        <div className={styles.proofRow}>
          <span><ShieldCheck size={17}/> No medical advice</span>
          <span><BrainCircuit size={17}/> Evidence path visible</span>
          <span><HeartHandshake size={17}/> Facilitator stays in control</span>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.formPanel}>
          <div className={styles.panelTop}>
            <div><span className={styles.step}>01</span><h2>Give the agent a few cultural anchors</h2></div>
            <Button variant="outline" className={styles.compactButton} disabled={loading} onClick={()=>{invalidate();setAnchors(initialAnchors)}}>Load example</Button>
          </div>
          <p className={styles.hint}>Preferences only—no resident/client name, email, health data, or other identifier is required.</p>
          <div className={styles.anchorGrid}>
            {anchors.map((anchor,index)=><div className={styles.anchorCard} key={index}>
              <span className={styles.anchorLabel}>Cultural anchor {index+1}</span>
              <Select value={anchor.type} onValueChange={(value)=>changeAnchorType(index,value as AnchorType)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{anchorTypes.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={anchor.query} disabled={loading} onChange={event=>changeAnchor(index,event.target.value)} placeholder={["Favorite artist","Favorite film","Favorite food, book, brand, or place","Another favorite"][index]} />
              {anchors.length > 2 && <Button variant="outline" className={styles.removeButton} disabled={loading} onClick={()=>removeAnchor(index)}><Trash2 size={14}/> Remove</Button>}
            </div>)}
          </div>
          <div className={styles.anchorControls}>
            <Button variant="outline" disabled={loading || anchors.length >= 4} onClick={addAnchor}><Plus size={15}/> Add another anchor</Button>
            <span>{anchors.length}/4 anchors</span>
          </div>
          <div className={styles.selectGrid}>
            <label><span>Energy</span><Select value={energy} disabled={loading} onValueChange={value=>{invalidate();setEnergy(value as typeof energy)}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="calm">Calm & familiar</SelectItem><SelectItem value="social">Social & conversational</SelectItem><SelectItem value="active">Lively & participatory</SelectItem></SelectContent></Select></label>
            <label><span>Setting</span><Select value={setting} disabled={loading} onValueChange={value=>{invalidate();setSetting(value as typeof setting)}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="one-on-one">One-on-one</SelectItem><SelectItem value="small-group">Small group</SelectItem><SelectItem value="community">Community room</SelectItem></SelectContent></Select></label>
            <label><span>Session length</span><Select value={String(durationMinutes)} disabled={loading} onValueChange={value=>{invalidate();setDurationMinutes(Number(value) as 30|45|60)}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="30">30 minutes</SelectItem><SelectItem value="45">45 minutes</SelectItem><SelectItem value="60">60 minutes</SelectItem></SelectContent></Select></label>
          </div>
          <div className={styles.actionRow}>
            <Button className={styles.runButton} disabled={!canRun} onClick={()=>void runLive()}>{loading ? "Grounding with Qloo…" : qlooReady ? <>Build with live Qloo <ArrowRight size={18}/></> : "Live Qloo unavailable"}</Button>
            <Button variant="outline" className={styles.demoButton} disabled={loading} onClick={previewDemo}>Preview with example data</Button>
          </div>
          <div className={styles.statusHelp}>
            <span>Contract {qlooSessionLogic.contractVersion}</span>
            {!qlooReady && status?.qlooStatus !== "preview" && <Button variant="outline" className={styles.compactButton} disabled={checkingStatus} onClick={()=>void refreshStatus(true)}><RefreshCw size={14}/> Retry Qloo verification</Button>}
          </div>
          {usableAnchors.length < 2 && <div className={styles.validation}>Enter at least two cultural anchors.</div>}
          {error && <div className={styles.error}><AlertCircle size={18}/><span>{error}</span></div>}
          {review && <section className={styles.reviewCard}>
            <b>Qloo match review required</b>
            <h3>Confirm non-exact entity matches before taste analysis</h3>
            <p>These are Qloo’s top returned entities, but their names do not exactly match what you entered. Confirm only if they represent what you meant; otherwise edit the anchor/category.</p>
            <div className={styles.reviewList}>{review.anchors.filter(item=>item.resolutionMatch==="top-result").map(item=><div key={item.entityId}><span>{item.query}</span><ArrowRight size={14}/><strong>{item.name}</strong><code>{item.entityId}</code></div>)}</div>
            <div className={styles.reviewActions}>
              <Button disabled={loading} onClick={()=>void runLive(review.anchors.filter(item=>item.resolutionMatch==="top-result").map(item=>item.entityId),review.token)}>Confirm matches & build</Button>
              <Button variant="outline" disabled={loading} onClick={()=>setReview(null)}>Edit anchors instead</Button>
            </div>
          </section>}
        </div>

        <aside className={styles.tracePanel}>
          <span className={styles.step}>AGENT TRACE</span>
          <h3>What happens after you press run</h3>
          <ol><li><span>1</span><div><b>Resolve</b><small>Resolve anchors to Qloo entity IDs; non-exact matches stop for review.</small></div></li><li><span>2</span><div><b>Evaluate</b><small>Select real numeric scores when present, otherwise preserve Qloo rank order.</small></div></li><li><span>3</span><div><b>Compose</b><small>Map selected evidence into the chosen setting, energy, and duration.</small></div></li><li><span>4</span><div><b>Explain</b><small>Expose the evidence path and rationale for every activity.</small></div></li></ol>
        </aside>
      </section>

      {result && delta && <section ref={resultRef} tabIndex={-1} className={styles.results}>
        <div className={styles.resultHeader}>
          <div>
            <Badge>{source==="live"?"LIVE QLOO":"ILLUSTRATIVE DEMO"}</Badge>
            <h2>{source==="live"?"Your Qloo-grounded session":"Illustrative session preview"}</h2>
            <p>{source==="live"?"Start with the outcome. Open the audit trail only when you want the full evidence path.":result.summary}</p>
          </div>
        </div>
        <div className={styles.resultActions}><Button variant="outline" onClick={()=>void copySession()}><Copy size={14}/>{copied?"Copied":"Copy session"}</Button><Button variant="outline" onClick={()=>window.print()}><Printer size={14}/> Print</Button><Button variant="outline" onClick={()=>{invalidate();window.scrollTo({top:0,behavior:"smooth"})}}>Start over</Button></div>
        {source==="demo" && <div className={styles.demoBanner}><AlertCircle size={17}/><span>Demo mode: these ranks and rationales are illustrative placeholders, not Qloo API results.</span></div>}

        <section className={styles.judgeJourney}>
          <article><span className={styles.journeyNumber}>1</span><b>Your favorites</b><div className={styles.journeyChips}>{result.resolvedAnchors.map(item=><span key={item.entityId}>{item.name}</span>)}</div></article>
          <ArrowRight className={styles.journeyArrow} size={22}/>
          <article className={styles.journeyQloo}><span className={styles.journeyNumber}>2</span><b>What Qloo discovered</b><div className={styles.journeyChips}>{selectedSequence.map((label,index)=><span key={label}>#{index+1} {label}</span>)}</div><small>{result.evidence.returnedAffinityCount} Qloo signals returned · {result.evidence.selectedAffinityCount} selected</small></article>
          <ArrowRight className={styles.journeyArrow} size={22}/>
          <article><span className={styles.journeyNumber}>3</span><b>Your session</b><strong>{result.plan.length} activities</strong><small>{result.evidence.sessionDurationMinutes} minutes · {result.evidence.energy} · {result.evidence.setting}</small></article>
        </section>

        <section className={styles.qlooDelta}>
          <header><b>Why Qloo matters</b><h3>{source==="live"?"How Qloo changed this session":"How Qloo would change this session"}</h3><p>The baseline below is intentionally competent but limited: it can use only the favorites and category hints supplied. It does not invent adjacent tastes.</p></header>
          <div className={styles.comparisonGrid}>
            <article className={styles.baselineCard}><span>Without Qloo · anchor-only baseline</span><ul>{delta.baseline.map(item=><li key={item.anchor}>{item.action}</li>)}</ul><small>Useful, but confined to what was already typed.</small></article>
            <article className={styles.withQlooCard}><span>{source==="live"?"With Qloo · live taste graph":"With Qloo · illustrative path"}</span><p>{source==="live"?`Qloo expanded the literal inputs into ${result.evidence.returnedAffinityCount} cross-category signals, selected ${result.evidence.selectedAffinityCount}, and grounded every activity in that additional evidence.`:"The illustrative path shows how adjacent cultural evidence can expand literal favorites into a broader session."}</p><div className={styles.deltaSignals}>{selectedSequence.map(label=><span key={label}>{label}</span>)}</div></article>
          </div>
          <div className={styles.deltaMetrics}><span><strong>{delta.inputAnchorCount}</strong> favorites supplied</span><span><strong>{delta.returnedSignalCount}</strong> Qloo signals discovered</span><span><strong>{delta.selectedSignalCount}</strong> signals selected</span><span><strong>{delta.activitiesInfluencedCount}</strong> activities influenced</span><span><strong>{delta.selectedSignalsNotNamedInInputs.length}</strong> selected discoveries not named in the inputs</span></div>
        </section>

        <section className={styles.sessionSection}>
          <div className={styles.sectionHeading}><b>03 · Your session</b><h3>A facilitator-ready starting point</h3></div>
          <div className={styles.planGrid}>{result.plan.map((item,index)=>{const Icon=[Music2,Film,Users,Utensils][index%4];const signal=item.affinityLabel?selectedOrder.get(item.affinityLabel):undefined;return <article key={item.title} className={styles.planCard}><div className={styles.cardIcon}><Icon size={21}/></div><span className={styles.duration}>{item.duration}</span><h3>{item.title}</h3><p className={styles.sessionAction}>{item.action}</p>{item.affinityLabel && <div className={styles.sessionSignal}>{signal?`Qloo signal #${signal}`:"Qloo signal"} · {item.affinityLabel}{item.anchorName?` · from ${item.anchorName}`:""}</div>}</article>})}</div>
        </section>

        <div className={styles.interpretation}><b>Interpretation limit</b><p>Qloo affinities are aggregate cultural relationships, not probabilities or claims about an individual. The facilitator can accept, modify, reorder, or reject any suggestion.</p></div>

        <details className={styles.auditTrail}>
          <summary>View evidence &amp; audit trail</summary>
          <div className={styles.auditBody}>
            <div className={styles.auditIntro}><h3>Full Qloo evidence path</h3><p>Technical provenance is preserved here without competing with the primary session experience.</p></div>
            <div className={styles.resultMeta}><span><b>Source</b>{source==="live"?"LIVE QLOO":"ILLUSTRATIVE DEMO"}</span><span><b>Evidence</b>{result.evidence.evidenceBasis==="normalized-score"?"Normalized Qloo score":"Ranked Qloo order"}</span><span><b>Request receipt</b>{result.requestContext.anchors.length} anchors · {result.requestContext.energy} · {result.requestContext.setting} · {result.requestContext.durationMinutes} min</span><span><b>Qloo API</b>{result.provenance.apiOrigin.replace(/^https:\/\//,"")}</span><span><b>Contract</b>{result.provenance.contractVersion}</span><span><b>{result.provenance.generatedAt?"Generated":"Timestamp"}</b>{result.provenance.generatedAt?new Date(result.provenance.generatedAt).toLocaleString():"Static example · no live timestamp"}</span></div>

            <section className={styles.evidenceBridge}>
              <div className={styles.evidenceColumn}><div className={styles.proofTitle}>INPUT EVIDENCE · Resolved favorites</div><div className={styles.chips}>{result.resolvedAnchors.map(item=><span key={item.entityId}><CheckCircle2 size={14}/><strong>{item.name}</strong><em>{item.resolutionMatch==="exact-name"?"Exact name":source==="live"?"Qloo top match · confirmed":"Qloo top match · review"}</em><code>{source==="live"?"Qloo":"Demo"} ID · {item.entityId}</code></span>)}</div>{result.evidence.topResultResolutionCount>0&&<div className={styles.resolutionNote}><b>{source==="live"?"Top matches confirmed":"Review entity matches"}</b><span>{source==="live"?`${result.evidence.topResultResolutionCount} non-exact Qloo top-result match(es) were explicitly confirmed before taste analysis.`:`${result.evidence.topResultResolutionCount} illustrative top-result match(es) should be reviewed.`}</span></div>}</div>
              <div className={styles.evidenceHandoff}><span>sent together to</span><strong>Qloo taste analysis</strong><ArrowRight size={18}/></div>
              <div className={styles.evidenceColumn}><div className={styles.evidenceHeading}><div className={styles.proofTitle}>QLOO OUTPUT EVIDENCE · All retained taste signals</div><span className={styles.signalCount}><strong>{result.evidence.selectedAffinityCount}</strong> selected / <strong>{result.evidence.returnedAffinityCount}</strong> returned</span></div><div className={styles.selectionRule}><b>Selection rule</b><span>{source==="demo"?"Illustrative: take the first ranked signals.":result.evidence.evidenceBasis==="normalized-score"?`Select up to ${result.evidence.selectedAffinityCount} highest numeric Qloo affinities.`:`Qloo did not supply enough numeric scores, so preserve its returned order and select the first ${result.evidence.selectedAffinityCount}. No percentage is invented.`}</span></div>{result.evidence.selectedAffinityCount < result.plan.length && <div className={styles.reuseNote}><b>No synthetic signal</b><span>Only {result.evidence.selectedAffinityCount} real selected signals support {result.plan.length} activities, so the last real signal is reused for the closing step instead of inventing another one.</span></div>}<div className={styles.affinityGrid}>{result.affinities.map((item,index)=>{const selected=selectedSet.has(item.label);const signal=selectedOrder.get(item.label);return <div key={item.label} className={selected?styles.affinitySelected:styles.affinitySupporting}><small>{selected?`Plan signal #${signal}`:"Additional evidence"}</small><span>{item.label}</span><b>{item.score===null?`Rank #${item.rank??index+1}`:`${Math.round(item.score*100)}%`}</b></div>})}</div></div>
            </section>

            <section className={styles.decisionTrace}><h3>Agent decision trace</h3><p>The audit trail exposes how the session was assembled.</p><div className={styles.metrics}><span><b>{result.evidence.resolvedAnchorCount}</b> anchors resolved</span><span><b>{result.evidence.exactResolutionCount}</b> exact-name matches</span><span><b>{result.evidence.topResultResolutionCount}</b>{source==="live"?" top matches confirmed":" top matches to review"}</span><span><b>{result.evidence.categoryHintCount}</b> category hints</span><span><b>{result.evidence.selectedAffinityCount}</b> signals selected</span><span><b>{result.evidence.returnedAffinityCount}</b> signals returned</span><span><b>{source==="live"?result.evidence.explainabilityResultCount:"—"}</b>{source==="live"?" Qloo-explained results":" live explainability"}</span><span><b>{result.evidence.aggregateExplainabilityAvailable?"Yes":"No"}</b> aggregate explainability</span></div><ol>{result.agentTrace.map(step=><li key={step.stage} className={step.status==="warning"?styles.traceWarning:""}><span>{step.stage}</span><p>{step.detail}</p></li>)}</ol></section>

            <section className={styles.auditRationales}><h3>Activity-to-evidence mapping</h3>{result.plan.map(item=>{const signal=item.affinityLabel?selectedOrder.get(item.affinityLabel):undefined;return <article key={item.title}><b>{item.title}</b><code>{signal?`Signal #${signal}: `:""}{item.anchorName?`${item.anchorName} + ${item.affinityLabel} → ${item.title}`:`${item.affinityLabel} → ${item.title}`}</code><p>{item.why}</p></article>})}</section>
          </div>
        </details>
      </section>}

      <section className={styles.impact}><span className={styles.step}>WHY THIS MATTERS</span><h2>Personalization without a profile, history, or identity graph.</h2><p>Start from a few real cultural preferences instead of a generic age-based activity list. No personal identifiers are required, and Resonance is not a medical tool.</p><div className={styles.impactStats}><div><strong>2–4</strong><span>taste anchors</span></div><div><strong>0</strong><span>PII required</span></div><div><strong>1</strong><span>auditable session plan</span></div></div></section>
      <footer><span>Resonance</span><span>Built for the Qloo Agent Hackathon · Cultural guidance, not medical advice.</span></footer>
    </main>
  </>;
}