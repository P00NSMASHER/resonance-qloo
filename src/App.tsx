import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeQlooState, qlooPresentation, type QlooUiState } from './lib/connectionState';
import { formatSessionText } from './lib/sessionExport';
import { ANCHOR_TYPE_OPTIONS, anchorTypeLabelFromUrn, type AnchorType } from './lib/anchorTypes';
import { hasVerifiedLiveProvenance } from './lib/liveProvenance';
import { hasConsistentRecommendationResult } from './lib/recommendationResult';

type AgentTraceStep = {
  stage: 'resolve' | 'evaluate' | 'compose' | 'explain';
  status: 'ok' | 'warning';
  detail: string;
};

type ResolvedAnchor = {
  query:string;
  name:string;
  entityId:string;
  requestedTypeUrn?:string;
  resolutionMatch:'exact-name'|'top-result';
};

type Result = {
  summary: string;
  resolvedAnchors: ResolvedAnchor[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string; anchorName?:string; affinityLabel?:string }[];
  agentTrace: AgentTraceStep[];
  evidence: {
    meanNormalizedScore: number|null;
    evidenceBasis: 'normalized-score'|'ranked-order';
    selectedAffinityCount: number;
    returnedAffinityCount: number;
    selectedAffinityLabels?: string[];
    resolvedAnchorCount: number;
    exactResolutionCount: number;
    topResultResolutionCount: number;
    categoryHintCount: number;
    explainabilityResultCount: number;
    aggregateExplainabilityAvailable: boolean;
    sessionDurationMinutes: number;
    energy: string;
    setting: string;
  };
  provenance: {
    source:'qloo-live'|'illustrative-demo';
    apiOrigin?:string;
    generatedAt?:string;
  };
};

const demo: Result = {
  summary: 'Illustrative preview only — this is not live Qloo data.',
  resolvedAnchors: [
    { query:'Ella Fitzgerald', name:'Ella Fitzgerald', entityId:'demo:ella', requestedTypeUrn:'urn:entity:artist', resolutionMatch:'exact-name' },
    { query:"Singin' in the Rain", name:"Singin' in the Rain", entityId:'demo:rain', requestedTypeUrn:'urn:entity:movie', resolutionMatch:'exact-name' },
    { query:'Italian food', name:'Italian cuisine', entityId:'demo:italian', resolutionMatch:'top-result' }
  ],
  affinities: [
    { label:'classic jazz vocals', score:null, rank:1 },
    { label:'Golden Age musicals', score:null, rank:2 },
    { label:'mid-century elegance', score:null, rank:3 },
    { label:'Italian-American comfort', score:null, rank:4 }
  ],
  plan: [
    { title:'Opening cue', duration:'10 min', action:'Open with a familiar Ella Fitzgerald track and invite a low-pressure choice between two songs.', why:'Illustrative rationale for the preview state.', anchorName:'Ella Fitzgerald', affinityLabel:'classic jazz vocals' },
    { title:'Story bridge', duration:'10 min', action:'Use a classic musical prompt to invite stories about theaters, dancing, or favorite performers.', why:'Illustrative rationale for the preview state.', anchorName:"Singin' in the Rain", affinityLabel:'Golden Age musicals' },
    { title:'Shared choice', duration:'15 min', action:'Offer adjacent prompts across music, fashion, or travel and let the group choose.', why:'Illustrative rationale for the preview state.', anchorName:'Italian cuisine', affinityLabel:'mid-century elegance' },
    { title:'Closing ritual', duration:'10 min', action:'Close around an Italian comfort-food prompt and ask what should return next time.', why:'Illustrative rationale for the preview state.', affinityLabel:'Italian-American comfort' }
  ],
  agentTrace: [
    { stage:'resolve', status:'warning', detail:'Illustrative: two anchors are exact-name matches; “Italian food” resolves to the Qloo top result “Italian cuisine,” which should be reviewed.' },
    { stage:'evaluate', status:'ok', detail:'Illustrative: retain the first four items from an affinity-ranked result without inventing numeric scores.' },
    { stage:'compose', status:'ok', detail:'Illustrative: adapt the session to the selected energy and setting.' },
    { stage:'explain', status:'ok', detail:'Illustrative: attach a visible rationale to each activity choice.' }
  ],
  evidence: {
    meanNormalizedScore:null,
    evidenceBasis:'ranked-order',
    selectedAffinityCount:4,
    returnedAffinityCount:4,
    selectedAffinityLabels:[
      'classic jazz vocals',
      'Golden Age musicals',
      'mid-century elegance',
      'Italian-American comfort',
    ],
    resolvedAnchorCount:3,
    exactResolutionCount:2,
    topResultResolutionCount:1,
    categoryHintCount:2,
    explainabilityResultCount:0,
    aggregateExplainabilityAvailable:false,
    sessionDurationMinutes:45,
    energy:'calm',
    setting:'small-group'
  },
  provenance: {
    source:'illustrative-demo'
  }
};

const anchorExamples = ['Favorite artist', 'Favorite film', 'Favorite food, brand, book, or place', 'Another favorite'];
const LIVE_REQUEST_TIMEOUT_MS = 28_000;

export default function App() {
  const [anchors, setAnchors] = useState(['Ella Fitzgerald',"Singin' in the Rain",'Italian food']);
  const [anchorTypes, setAnchorTypes] = useState<AnchorType[]>(['artist','movie','any']);
  const [energy, setEnergy] = useState('calm');
  const [setting, setSetting] = useState('small-group');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [qlooState, setQlooState] = useState<QlooUiState>('checking');
  const [qlooApiOrigin, setQlooApiOrigin] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [source, setSource] = useState<'live'|'demo'|null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolutionReview, setResolutionReview] = useState<ResolvedAnchor[] | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const usableAnchors = useMemo(() => {
    const entries = anchors.map((query,index) => ({
      query:query.trim(),
      type:anchorTypes[index] ?? 'any',
    })).filter(item => item.query.length >= 2);
    return [...new Map(entries.map(item => [`${item.type}|${item.query.toLocaleLowerCase()}`,item])).values()];
  }, [anchors,anchorTypes]);
  const qlooUi = qlooPresentation(qlooState);
  const canRun = usableAnchors.length >= 2 && qlooUi.liveReady && !loading;
  const selectedAffinitySequence = result
    ? (Array.isArray(result.evidence.selectedAffinityLabels) && result.evidence.selectedAffinityLabels.length
      ? result.evidence.selectedAffinityLabels
      : result.affinities.slice(0, result.evidence.selectedAffinityCount).map(item => item.label))
    : [];
  const selectedAffinityLabels = new Set<string>(selectedAffinitySequence);
  const selectedAffinityOrder = new Map<string, number>(
    selectedAffinitySequence.map((label,index) => [label,index + 1]),
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);

    fetch('/api/status', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('status unavailable');
        return r.json();
      })
      .then(x => {
        const nextState = normalizeQlooState(x);
        const origin = typeof x?.qlooApiOrigin === 'string' ? x.qlooApiOrigin : '';
        setQlooApiOrigin(origin);
        setQlooState(nextState === 'ready' && !origin ? 'degraded' : nextState);
      })
      .catch(() => {
        setQlooApiOrigin('');
        setQlooState('degraded');
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (result) window.requestAnimationFrame(() => resultRef.current?.focus());
  }, [result]);

  useEffect(() => {
    setResolutionReview(null);
  }, [anchors,anchorTypes]);

  async function runLive(confirmedEntityIds: string[] = []) {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSource(null);
    if (!confirmedEntityIds.length) setResolutionReview(null);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIVE_REQUEST_TIMEOUT_MS);

    try {
      const r = await fetch('/api/recommend', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({anchors:usableAnchors,energy,setting,durationMinutes,confirmedEntityIds}),
        signal:controller.signal
      });
      const data = await r.json();
      if (
        r.status === 409 &&
        data?.code === 'QLOO_RESOLUTION_REVIEW_REQUIRED' &&
        Array.isArray(data.resolvedAnchors)
      ) {
        setResolutionReview(data.resolvedAnchors);
        return;
      }
      if (!r.ok) throw new Error(data.error || 'Qloo request failed');
      if (!hasConsistentRecommendationResult(data)) {
        throw new Error('Live Qloo response did not match the expected evidence contract. Please retry.');
      }
      if (!hasVerifiedLiveProvenance(data, qlooApiOrigin)) {
        throw new Error('Live Qloo provenance could not be verified. Please retry after the connection status refreshes.');
      }
      setResolutionReview(null);
      setResult(data);
      setSource('live');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('The request timed out. Please try again.');
      } else {
        setError(e instanceof Error ? e.message : 'Request failed');
      }
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }

  function invalidateGeneratedState() {
    setResult(null);
    setSource(null);
    setError('');
    setCopied(false);
    setResolutionReview(null);
  }

  function updateAnchor(index: number, value: string) {
    invalidateGeneratedState();
    setAnchors(current => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function updateAnchorType(index: number, value: AnchorType) {
    invalidateGeneratedState();
    setAnchorTypes(current => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function updateEnergy(value: string) {
    invalidateGeneratedState();
    setEnergy(value);
  }

  function updateSetting(value: string) {
    invalidateGeneratedState();
    setSetting(value);
  }

  function updateDuration(value: number) {
    invalidateGeneratedState();
    setDurationMinutes(value);
  }

  function addAnchor() {
    invalidateGeneratedState();
    setAnchors(current => current.length >= 4 ? current : [...current, '']);
    setAnchorTypes(current => current.length >= 4 ? current : [...current, 'any']);
  }

  function removeAnchor(index: number) {
    invalidateGeneratedState();
    setAnchors(current => current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index));
    setAnchorTypes(current => current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  function previewDemo() {
    setError('');
    setResolutionReview(null);
    setAnchors(['Ella Fitzgerald',"Singin' in the Rain",'Italian food']);
    setAnchorTypes(['artist','movie','any']);
    setEnergy('calm');
    setSetting('small-group');
    setDurationMinutes(45);
    setResult(demo);
    setSource('demo');
  }

  async function copySession() {
    if (!result || !source) return;
    try {
      await navigator.clipboard.writeText(formatSessionText(result, source));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. You can still print the session.');
    }
  }

  function startOver() {
    setResult(null);
    setSource(null);
    setError('');
    setCopied(false);
    setResolutionReview(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <main className="page">
    <header>
      <div className="brand"><span aria-hidden="true">R</span>Resonance</div>
      <div className={`status ${qlooState === 'ready' ? 'live' : qlooState === 'degraded' ? 'degraded' : 'pending'}`} role="status" aria-live="polite">
        {qlooUi.label}
      </div>
    </header>

    <section className="hero" aria-labelledby="hero-title">
      <div className="eyebrow">Cultural intelligence for human connection</div>
      <h1 id="hero-title">Turn what someone loves into a moment that feels <em>like them.</em></h1>
      <p>Resonance helps senior-living activity teams and families turn a few known favorites into a culturally coherent engagement session. Qloo provides the cross-category taste signal; the agent evaluates the evidence, adapts the plan, and explains each choice.</p>
    </section>

    <section className="workspace" aria-label="Resonance session builder">
      <div className="card">
        <h2>Give the agent a few cultural anchors</h2>
        <p className="fieldHint">Use cultural preferences only. Do not enter a resident/person name, email, account ID, health information, location history, or another personal identifier.</p>
        <div className="inputs">
          {anchors.map((anchor,index)=><div className="anchorGroup" key={index}>
            <label className="anchorField" htmlFor={`anchor-${index}`}>
              <span>Cultural anchor {index + 1}</span>
              <select
                className="anchorType"
                aria-label={`Category for cultural anchor ${index + 1}`}
                value={anchorTypes[index] ?? 'any'}
                disabled={loading}
                onChange={e=>updateAnchorType(index,e.target.value as AnchorType)}
              >
                {ANCHOR_TYPE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input
                id={`anchor-${index}`}
                value={anchor}
                disabled={loading}
                onChange={e=>updateAnchor(index, e.target.value)}
                placeholder={anchorExamples[index] ?? 'Another favorite'}
                autoComplete="off"
                maxLength={100}
              />
            </label>
            {anchors.length > 2 && <button type="button" className="anchorRemove" disabled={loading} onClick={()=>removeAnchor(index)} aria-label={`Remove cultural anchor ${index + 1}`}>Remove</button>}
          </div>)}
        </div>
        <div className="anchorControls">
          <button type="button" className="anchorAdd" disabled={anchors.length >= 4 || loading} onClick={addAnchor}>+ Add another anchor</button>
          <span>{anchors.length}/4 anchors</span>
        </div>
        <div className="selects">
          <label htmlFor="energy">Energy
            <select id="energy" value={energy} disabled={loading} onChange={e=>updateEnergy(e.target.value)}>
              <option value="calm">Calm & familiar</option>
              <option value="social">Social & conversational</option>
              <option value="active">Lively & participatory</option>
            </select>
          </label>
          <label htmlFor="setting">Setting
            <select id="setting" value={setting} disabled={loading} onChange={e=>updateSetting(e.target.value)}>
              <option value="one-on-one">One-on-one</option>
              <option value="small-group">Small group</option>
              <option value="community">Community room</option>
            </select>
          </label>
          <label htmlFor="duration">Session length
            <select id="duration" value={durationMinutes} disabled={loading} onChange={e=>updateDuration(Number(e.target.value))}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button disabled={!canRun} onClick={()=>runLive()}>
            {loading?'Grounding with Qloo…':qlooUi.liveReady?'Build with live Qloo':'Live Qloo unavailable'}
          </button>
          <button className="secondary" onClick={previewDemo} disabled={loading}>Preview with example data</button>
        </div>
        <small>{qlooUi.helper}</small>
        {usableAnchors.length < 2 && <div className="validation" role="status">Enter at least two distinct cultural anchors.</div>}
        {error && <div className="error" role="alert">{error}</div>}
        {resolutionReview && <section className="resolutionReview" aria-labelledby="resolution-review-title">
          <div>
            <b>Qloo match review required</b>
            <h3 id="resolution-review-title">Confirm non-exact entity matches before taste analysis</h3>
            <p>Qloo returned these as its top entity matches, but their names do not exactly match the anchors you entered. Confirm them only if they represent what you meant.</p>
          </div>
          <div className="resolutionReviewList">
            {resolutionReview.filter(item => item.resolutionMatch === 'top-result').map(item=><div key={item.entityId}>
              <span><small>Your anchor</small><strong>{item.query}</strong></span>
              <i aria-hidden="true">→</i>
              <span><small>Qloo top match</small><strong>{item.name}</strong>{item.requestedTypeUrn && <em>{anchorTypeLabelFromUrn(item.requestedTypeUrn) ?? item.requestedTypeUrn}</em>}<code>{item.entityId}</code></span>
            </div>)}
          </div>
          <div className="resolutionReviewActions">
            <button type="button" disabled={loading} onClick={()=>runLive(resolutionReview.filter(item => item.resolutionMatch === 'top-result').map(item => item.entityId))}>Confirm matches & build</button>
            <button type="button" className="secondary" disabled={loading} onClick={()=>setResolutionReview(null)}>Edit anchors instead</button>
          </div>
        </section>}
      </div>
      <aside className="trace" aria-label="Agent loop">
        <h3>Agent loop</h3>
        <ol><li>Resolve cultural anchors</li><li>Evaluate Qloo evidence</li><li>Compose for the chosen context</li><li>Explain every recommendation</li></ol>
      </aside>
    </section>

    {result && <section ref={resultRef} tabIndex={-1} className="results" aria-labelledby="result-title">
      <div className="resultTop"><div><h2 id="result-title">{source==='live'?'Your Qloo-grounded session':'Illustrative session preview'}</h2><p>{result.summary}</p></div></div>
      <div className="resultMeta" aria-label="Result provenance and evidence">
        <span className={source === 'live' ? 'metaLive' : 'metaDemo'}><b>Source</b>{source === 'live' ? 'LIVE QLOO' : 'ILLUSTRATIVE DEMO'}</span>
        <span><b>Evidence</b>{result.evidence.evidenceBasis === 'ranked-order' ? 'Ranked Qloo order' : 'Normalized Qloo score'}</span>
        {source === 'live' && result.provenance.apiOrigin && <span><b>Qloo API</b>{result.provenance.apiOrigin.replace(/^https:\/\//,'')}</span>}
        <span><b>{result.provenance.generatedAt ? 'Generated' : 'Timestamp'}</b>{result.provenance.generatedAt ? new Date(result.provenance.generatedAt).toLocaleString() : 'Static example · no live timestamp'}</span>
      </div>
      <div className="resultActions" aria-label="Session actions">
        <button type="button" className="secondary" onClick={copySession}>{copied ? 'Copied' : 'Copy session'}</button>
        <button type="button" className="secondary" onClick={()=>window.print()}>Print</button>
        <button type="button" className="secondary" onClick={startOver}>Start over</button>
        <span className="copyStatus" role="status" aria-live="polite">{copied ? 'Session copied to clipboard.' : ''}</span>
      </div>
      {source==='demo' && <div className="warning" role="note">Demo mode: these affinity ranks and rationales are placeholders, not Qloo API results.</div>}
      <div className="interpretationLimit" role="note">
        <b>Interpretation limit</b>
        <span>Qloo affinities describe aggregate cultural relationships, not a probability or claim about this individual. Use the plan as a facilitator-reviewed starting point: accept, modify, reorder, or reject any suggestion based on the person’s actual response.</span>
      </div>

      <section className="evidenceBridge" aria-labelledby="evidence-bridge-title">
        <div className="evidenceColumn">
          <div className="evidenceHeading"><b>Input evidence</b><h3 id="evidence-bridge-title">Resolved favorites</h3></div>
          <div className="chips">{result.resolvedAnchors.map(x=><span key={x.entityId}><strong>{x.name}</strong>{x.requestedTypeUrn && <em>{anchorTypeLabelFromUrn(x.requestedTypeUrn) ?? x.requestedTypeUrn}</em>}<em className={x.resolutionMatch === 'exact-name' ? 'matchExact' : source === 'live' ? 'matchConfirmed' : 'matchReview'}>{x.resolutionMatch === 'exact-name' ? 'Exact name' : source === 'live' ? 'Qloo top match · confirmed' : 'Qloo top match · review'}</em><code className="entityId" title={x.entityId}>{source === 'live' ? 'Qloo ID' : 'Demo ID'} · {x.entityId}</code></span>)}</div>
          {result.evidence.topResultResolutionCount > 0 && <div className="resolutionNote" role="note"><b>{source === 'live' ? 'Top matches confirmed' : 'Review entity matches'}</b><span>{source === 'live' ? `${result.evidence.topResultResolutionCount} non-exact Qloo top-result match${result.evidence.topResultResolutionCount === 1 ? '' : 'es'} were explicitly confirmed before taste analysis.` : `${result.evidence.topResultResolutionCount} resolved anchor${result.evidence.topResultResolutionCount === 1 ? '' : 's'} used Qloo's top returned entity without an exact name match. Refine the anchor or category if a match looks unexpected.`}</span></div>}
        </div>
        <div className="evidenceHandoff" aria-label={source === 'live' ? 'Resolved favorites are sent together into Qloo taste analysis' : 'Illustrative favorites feed the example Qloo taste-analysis path'}>
          <span>{source === 'live' ? 'sent together to' : 'illustrate input to'}</span>
          <strong>Qloo taste analysis</strong>
          <i aria-hidden="true">→</i>
        </div>
        <div className="evidenceColumn">
          <div className="evidenceHeading"><div><b>{source === 'live' ? 'Qloo output evidence' : 'Illustrative output evidence'}</b><h3>{source==='live'?'Taste signals':'Example taste signals'}</h3></div><span className="signalCount"><strong>{result.evidence.selectedAffinityCount}</strong> selected / <strong>{result.evidence.returnedAffinityCount}</strong> {source === 'live' ? 'returned' : 'example'}</span></div>
          <div className="selectionRule">
            <b>Selection rule</b>
            <span>{source === 'demo'
              ? `Illustrative: select the first ${result.evidence.selectedAffinityCount} signals from the example rank order.`
              : result.evidence.evidenceBasis === 'normalized-score'
                ? `Select up to ${result.evidence.selectedAffinityCount} highest numeric Qloo affinities. Returned scores determine the order.`
                : `Qloo did not supply enough numeric scores, so preserve its returned affinity order and select the first ${result.evidence.selectedAffinityCount}. No percentage is invented.`
            }</span>
          </div>
          {result.evidence.selectedAffinityCount < result.plan.length && <div className="evidenceReuseNote" role="note">
            <b>No synthetic signal</b>
            <span>Only {result.evidence.selectedAffinityCount} unique {source === 'live' ? 'Qloo' : 'example'} signals were selected for {result.plan.length} activities, so the last real selected signal is reused for the closing step instead of inventing another one.</span>
          </div>}
          <div className="affinities">{result.affinities.map(x=>{const selected=selectedAffinityLabels.has(x.label);const signalNumber=selectedAffinityOrder.get(x.label);return <div key={x.label} className={selected ? 'selected' : 'supporting'}><small>{selected ? `Plan signal #${signalNumber}` : 'Additional evidence'}</small><span>{x.label}</span><b>{x.score === null ? `Rank #${x.rank}` : `${Math.round(x.score*100)}%`}</b></div>})}</div>
        </div>
      </section>

      <section className="decisionTrace" aria-labelledby="decision-trace-title">
        <div>
          <h3 id="decision-trace-title">Agent decision trace</h3>
          <p>The agent exposes the evidence path instead of hiding how the session was assembled.</p>
        </div>
        <div className="evidenceMetrics">
          <span><b>{result.evidence.resolvedAnchorCount}</b> anchors resolved</span>
          <span><b>{result.evidence.exactResolutionCount}</b> exact-name matches</span>
          <span><b>{result.evidence.topResultResolutionCount}</b>{source === 'live' ? ' top matches confirmed' : ' top matches to review'}</span>
          <span><b>{result.evidence.categoryHintCount}</b> category hints</span>
          <span><b>{result.evidence.selectedAffinityCount}</b> signals selected</span>
          <span><b>{result.evidence.returnedAffinityCount}</b> signals returned</span>
          <span><b>{result.evidence.sessionDurationMinutes}</b> minutes</span>
          <span><b>{result.evidence.energy}</b> energy</span>
          <span><b>{result.evidence.setting}</b> setting</span>
          <span><b>{source === 'live' ? result.evidence.explainabilityResultCount : '—'}</b>{source === 'live' ? ' Qloo-explained results' : ' live explainability'}</span>
          <span><b>{result.evidence.meanNormalizedScore === null ? 'Ranked' : `${Math.round(result.evidence.meanNormalizedScore*100)}%`}</b>{result.evidence.evidenceBasis === 'ranked-order' ? ' Qloo result order' : ' mean normalized score'}</span>
        </div>
        <p className="fieldHint">
          <b>{source === 'live' ? 'Selected Qloo signals:' : 'Illustrative selected signals:'}</b>{' '}
          {(Array.isArray(result.evidence.selectedAffinityLabels) && result.evidence.selectedAffinityLabels.length
            ? result.evidence.selectedAffinityLabels
            : result.affinities.slice(0, result.evidence.selectedAffinityCount).map(item => item.label)
          ).join(' · ')}
        </p>
        <ol className="agentTraceList">
          {result.agentTrace.map(step=><li key={step.stage} className={step.status}>
            <span>{step.stage}</span>
            <p>{step.detail}</p>
          </li>)}
        </ol>
      </section>

      <section className="qlooImpactSummary" aria-labelledby="qloo-impact-title">
        <div>
          <b>{source === 'live' ? 'Qloo contribution' : 'Illustrative Qloo path'}</b>
          <h3 id="qloo-impact-title">{source === 'live' ? 'How Qloo changed this plan' : 'How Qloo would shape this plan'}</h3>
          <p>{source === 'live'
            ? `Qloo expanded ${result.resolvedAnchors.length} resolved favorites into ${result.evidence.selectedAffinityCount} selected cross-category signals. The agent mapped those signals into the ${result.plan.length} activities below instead of starting from a generic profile.`
            : `This example shows how ${result.resolvedAnchors.length} cultural anchors can become ${result.evidence.selectedAffinityCount} adjacent signals and then ${result.plan.length} tailored activities. These values are illustrative, not live Qloo results.`
          }</p>
        </div>
        <div className="impactFlow" aria-label="Evidence flow summary">
          <span><strong>{result.resolvedAnchors.length}</strong> favorites</span>
          <i aria-hidden="true">→</i>
          <span><strong>{result.evidence.selectedAffinityCount}</strong> {source === 'live' ? 'Qloo signals' : 'example signals'}</span>
          <i aria-hidden="true">→</i>
          <span><strong>{result.plan.length}</strong> activities</span>
        </div>
      </section>

      <div className="plan">{result.plan.map(x=>{const signalNumber=x.affinityLabel ? selectedAffinityOrder.get(x.affinityLabel) : undefined;return <article key={x.title}><small>{x.duration}</small><h3>{x.title}</h3>{x.affinityLabel && <div className="bridge">{x.anchorName && <div className="bridgeNode"><b>Known favorite</b><span>{x.anchorName}</span></div>}<div className="bridgeNode"><b>{signalNumber ? `Qloo signal #${signalNumber}` : 'Qloo signal'}</b><span>{x.affinityLabel}</span></div></div>}<div className="activityEvidence"><b>Resulting activity</b><p>{x.action}</p></div><div className="rationale"><b>Evidence-backed rationale</b>{x.affinityLabel && <div className="rationalePath">{signalNumber ? `Signal #${signalNumber}: ` : ''}{x.anchorName ? `${x.anchorName} + ${x.affinityLabel} → ${x.title}` : `${x.affinityLabel} → ${x.title}`}</div>}<p>{x.why}</p></div></article>})}</div>
    </section>}

    <section className="impact"><h2>Personalization without a profile, history, or identity graph.</h2><p>Start from a few real favorites instead of a generic age-based activity list. No personal identifiers are required, and Resonance is not a medical tool.</p></section>
  </main>;
}