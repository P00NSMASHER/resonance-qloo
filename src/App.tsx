import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeQlooState, qlooPresentation, type QlooUiState } from './lib/connectionState';
import { formatSessionText } from './lib/sessionExport';
import { ANCHOR_TYPE_OPTIONS, anchorTypeLabelFromUrn, type AnchorType } from './lib/anchorTypes';

type AgentTraceStep = {
  stage: 'resolve' | 'evaluate' | 'compose' | 'explain';
  status: 'ok' | 'warning';
  detail: string;
};

type Result = {
  summary: string;
  resolvedAnchors: { query:string; name:string; entityId:string; requestedTypeUrn?:string }[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string; anchorName?:string; affinityLabel?:string }[];
  agentTrace: AgentTraceStep[];
  evidence: {
    meanNormalizedScore: number|null;
    evidenceBasis: 'normalized-score'|'ranked-order';
    selectedAffinityCount: number;
    resolvedAnchorCount: number;
    categoryHintCount: number;
    explainabilityResultCount: number;
    aggregateExplainabilityAvailable: boolean;
    sessionDurationMinutes: number;
    energy: string;
    setting: string;
  };
  provenance: {
    source:'qloo-live'|'illustrative-demo';
    generatedAt?:string;
  };
};

const demo: Result = {
  summary: 'Illustrative preview only — this is not live Qloo data.',
  resolvedAnchors: [
    { query:'Ella Fitzgerald', name:'Ella Fitzgerald', entityId:'demo:ella' },
    { query:"Singin' in the Rain", name:"Singin' in the Rain", entityId:'demo:rain' },
    { query:'Italian food', name:'Italian cuisine', entityId:'demo:italian' }
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
    { stage:'resolve', status:'ok', detail:'Illustrative: resolve three cultural anchors into Qloo-backed evidence.' },
    { stage:'evaluate', status:'ok', detail:'Illustrative: retain the first four items from an affinity-ranked result without inventing numeric scores.' },
    { stage:'compose', status:'ok', detail:'Illustrative: adapt the session to the selected energy and setting.' },
    { stage:'explain', status:'ok', detail:'Illustrative: attach a visible rationale to each activity choice.' }
  ],
  evidence: {
    meanNormalizedScore:null,
    evidenceBasis:'ranked-order',
    selectedAffinityCount:4,
    resolvedAnchorCount:3,
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

export default function App() {
  const [anchors, setAnchors] = useState(['Ella Fitzgerald',"Singin' in the Rain",'Italian food']);
  const [anchorTypes, setAnchorTypes] = useState<AnchorType[]>(['artist','movie','any']);
  const [energy, setEnergy] = useState('calm');
  const [setting, setSetting] = useState('small-group');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [qlooState, setQlooState] = useState<QlooUiState>('checking');
  const [result, setResult] = useState<Result | null>(null);
  const [source, setSource] = useState<'live'|'demo'|null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);

    fetch('/api/status', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('status unavailable');
        return r.json();
      })
      .then(x => setQlooState(normalizeQlooState(x)))
      .catch(() => setQlooState('degraded'))
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (result) window.requestAnimationFrame(() => resultRef.current?.focus());
  }, [result]);

  async function runLive() {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSource(null);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);

    try {
      const r = await fetch('/api/recommend', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({anchors:usableAnchors,energy,setting,durationMinutes}),
        signal:controller.signal
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Qloo request failed');
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

  function updateAnchor(index: number, value: string) {
    setAnchors(current => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function updateAnchorType(index: number, value: AnchorType) {
    setAnchorTypes(current => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function addAnchor() {
    setAnchors(current => current.length >= 4 ? current : [...current, '']);
    setAnchorTypes(current => current.length >= 4 ? current : [...current, 'any']);
  }

  function removeAnchor(index: number) {
    setAnchors(current => current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index));
    setAnchorTypes(current => current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  function previewDemo() {
    setError('');
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
        <p className="fieldHint">Use preferences only. No names, emails, health information, or other personal identifiers are needed.</p>
        <div className="inputs">
          {anchors.map((anchor,index)=><div className="anchorGroup" key={index}>
            <label className="anchorField" htmlFor={`anchor-${index}`}>
              <span>Cultural anchor {index + 1}</span>
              <select
                className="anchorType"
                aria-label={`Category for cultural anchor ${index + 1}`}
                value={anchorTypes[index] ?? 'any'}
                onChange={e=>updateAnchorType(index,e.target.value as AnchorType)}
              >
                {ANCHOR_TYPE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input
                id={`anchor-${index}`}
                value={anchor}
                onChange={e=>updateAnchor(index, e.target.value)}
                placeholder={anchorExamples[index] ?? 'Another favorite'}
                autoComplete="off"
                maxLength={100}
              />
            </label>
            {anchors.length > 2 && <button type="button" className="anchorRemove" onClick={()=>removeAnchor(index)} aria-label={`Remove cultural anchor ${index + 1}`}>Remove</button>}
          </div>)}
        </div>
        <div className="anchorControls">
          <button type="button" className="anchorAdd" disabled={anchors.length >= 4 || loading} onClick={addAnchor}>+ Add another anchor</button>
          <span>{anchors.length}/4 anchors</span>
        </div>
        <div className="selects">
          <label htmlFor="energy">Energy
            <select id="energy" value={energy} onChange={e=>setEnergy(e.target.value)}>
              <option value="calm">Calm & familiar</option>
              <option value="social">Social & conversational</option>
              <option value="active">Lively & participatory</option>
            </select>
          </label>
          <label htmlFor="setting">Setting
            <select id="setting" value={setting} onChange={e=>setSetting(e.target.value)}>
              <option value="one-on-one">One-on-one</option>
              <option value="small-group">Small group</option>
              <option value="community">Community room</option>
            </select>
          </label>
          <label htmlFor="duration">Session length
            <select id="duration" value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button disabled={!canRun} onClick={runLive}>
            {loading?'Grounding with Qloo…':qlooUi.liveReady?'Build with live Qloo':'Live Qloo unavailable'}
          </button>
          <button className="secondary" onClick={previewDemo} disabled={loading}>Preview with example data</button>
        </div>
        <small>{qlooUi.helper}</small>
        {usableAnchors.length < 2 && <div className="validation" role="status">Enter at least two distinct cultural anchors.</div>}
        {error && <div className="error" role="alert">{error}</div>}
      </div>
      <aside className="trace" aria-label="Agent loop">
        <h3>Agent loop</h3>
        <ol><li>Resolve cultural anchors</li><li>Evaluate Qloo evidence</li><li>Compose for the chosen context</li><li>Explain every recommendation</li></ol>
      </aside>
    </section>

    {result && <section ref={resultRef} tabIndex={-1} className="results" aria-labelledby="result-title">
      <div className="resultTop"><div><h2 id="result-title">{source==='live'?'Your Qloo-grounded session':'Illustrative session preview'}</h2><p>{result.summary}</p></div><b>{source==='live'?'LIVE QLOO':'ILLUSTRATIVE DEMO'}</b></div>
      <div className="provenanceLine">
        <strong>{result.provenance.source === 'qloo-live' ? 'Verified live Qloo result' : 'Illustrative preview data'}</strong>
        {result.provenance.generatedAt && <span>Generated {new Date(result.provenance.generatedAt).toLocaleString()}</span>}
      </div>
      <div className="resultActions" aria-label="Session actions">
        <button type="button" className="secondary" onClick={copySession}>{copied ? 'Copied' : 'Copy session'}</button>
        <button type="button" className="secondary" onClick={()=>window.print()}>Print</button>
        <button type="button" className="secondary" onClick={startOver}>Start over</button>
        <span className="copyStatus" role="status" aria-live="polite">{copied ? 'Session copied to clipboard.' : ''}</span>
      </div>
      {source==='demo' && <div className="warning" role="note">Demo mode: these affinity ranks and rationales are placeholders, not Qloo API results.</div>}

      <h3>Resolved anchors</h3>
      <div className="chips">{result.resolvedAnchors.map(x=><span key={x.entityId}><strong>{x.name}</strong>{x.requestedTypeUrn && <em>{anchorTypeLabelFromUrn(x.requestedTypeUrn) ?? x.requestedTypeUrn}</em>}</span>)}</div>

      <h3>{source==='live'?'Qloo taste evidence':'Illustrative taste-evidence preview'}</h3>
      <div className="affinities">{result.affinities.map(x=><div key={x.label}><span>{x.label}</span><b>{x.score === null ? `Rank #${x.rank}` : `${Math.round(x.score*100)}%`}</b></div>)}</div>

      <section className="decisionTrace" aria-labelledby="decision-trace-title">
        <div>
          <h3 id="decision-trace-title">Agent decision trace</h3>
          <p>The agent exposes the evidence path instead of hiding how the session was assembled.</p>
        </div>
        <div className="evidenceMetrics">
          <span><b>{result.evidence.resolvedAnchorCount}</b> anchors resolved</span>
          <span><b>{result.evidence.categoryHintCount}</b> category hints</span>
          <span><b>{result.evidence.selectedAffinityCount}</b> affinities selected</span>
          <span><b>{result.evidence.sessionDurationMinutes}</b> minutes</span>
          <span><b>{result.evidence.energy}</b> energy</span>
          <span><b>{result.evidence.setting}</b> setting</span>
          <span><b>{source === 'live' ? result.evidence.explainabilityResultCount : '—'}</b>{source === 'live' ? ' Qloo-explained results' : ' live explainability'}</span>
          <span><b>{result.evidence.meanNormalizedScore === null ? 'Ranked' : `${Math.round(result.evidence.meanNormalizedScore*100)}%`}</b>{result.evidence.evidenceBasis === 'ranked-order' ? ' Qloo result order' : ' mean normalized score'}</span>
        </div>
        <ol className="agentTraceList">
          {result.agentTrace.map(step=><li key={step.stage} className={step.status}>
            <span>{step.stage}</span>
            <p>{step.detail}</p>
          </li>)}
        </ol>
      </section>

      <div className="plan">{result.plan.map(x=><article key={x.title}><small>{x.duration}</small><h3>{x.title}</h3>{x.affinityLabel && <p><b>{x.anchorName ? "Known favorite → Qloo bridge" : "Qloo signal"}</b><br/>{x.anchorName ? x.anchorName + " → " + x.affinityLabel : x.affinityLabel}</p>}<p>{x.action}</p><div><b>Why it fits</b><br/>{x.why}</div></article>)}</div>
    </section>}

    <section className="impact"><h2>Personalization without a profile, history, or identity graph.</h2><p>Start from a few real favorites instead of a generic age-based activity list. No personal identifiers are required, and Resonance is not a medical tool.</p></section>
  </main>;
}