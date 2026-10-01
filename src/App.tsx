import { useEffect, useMemo, useRef, useState } from 'react';

type AgentTraceStep = {
  stage: 'resolve' | 'evaluate' | 'compose' | 'explain';
  status: 'ok' | 'warning';
  detail: string;
};

type Result = {
  summary: string;
  resolvedAnchors: { query:string; name:string; urn:string }[];
  affinities: { label:string; score:number }[];
  plan: { title:string; duration:string; action:string; why:string }[];
  agentTrace: AgentTraceStep[];
  evidence: {
    confidence: number;
    selectedAffinityCount: number;
    resolvedAnchorCount: number;
  };
};

const demo: Result = {
  summary: 'Illustrative preview only — this is not live Qloo data.',
  resolvedAnchors: [
    { query:'Ella Fitzgerald', name:'Ella Fitzgerald', urn:'demo:ella' },
    { query:"Singin' in the Rain", name:"Singin' in the Rain", urn:'demo:rain' },
    { query:'Italian food', name:'Italian cuisine', urn:'demo:italian' }
  ],
  affinities: [
    { label:'classic jazz vocals', score:.94 },
    { label:'Golden Age musicals', score:.88 },
    { label:'mid-century elegance', score:.81 },
    { label:'Italian-American comfort', score:.77 }
  ],
  plan: [
    { title:'Opening cue', duration:'10 min', action:'Open with a familiar Ella Fitzgerald track and invite a low-pressure choice between two songs.', why:'Illustrative rationale for the preview state.' },
    { title:'Story bridge', duration:'15 min', action:'Use a classic musical prompt to invite stories about theaters, dancing, or favorite performers.', why:'Illustrative rationale for the preview state.' },
    { title:'Shared choice', duration:'15 min', action:'Offer adjacent prompts across music, fashion, or travel and let the group choose.', why:'Illustrative rationale for the preview state.' },
    { title:'Closing ritual', duration:'10 min', action:'Close around an Italian comfort-food prompt and ask what should return next time.', why:'Illustrative rationale for the preview state.' }
  ],
  agentTrace: [
    { stage:'resolve', status:'ok', detail:'Illustrative: resolve three cultural anchors into Qloo-backed evidence.' },
    { stage:'evaluate', status:'ok', detail:'Illustrative: retain the strongest cross-category affinities and discard weaker signals.' },
    { stage:'compose', status:'ok', detail:'Illustrative: adapt the session to the selected energy and setting.' },
    { stage:'explain', status:'ok', detail:'Illustrative: attach a visible rationale to each activity choice.' }
  ],
  evidence: {
    confidence:.85,
    selectedAffinityCount:4,
    resolvedAnchorCount:3
  }
};

const anchorLabels = ['Favorite artist', 'Favorite film', 'Favorite food, brand, book, or place'];

export default function App() {
  const [anchors, setAnchors] = useState(['Ella Fitzgerald',"Singin' in the Rain",'Italian food']);
  const [energy, setEnergy] = useState('calm');
  const [setting, setSetting] = useState('small-group');
  const [qlooReady, setQlooReady] = useState<boolean | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [source, setSource] = useState<'live'|'demo'|null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLElement | null>(null);

  const usableAnchors = useMemo(
    () => [...new Set(anchors.map(x => x.trim()).filter(x => x.length >= 2))],
    [anchors]
  );
  const canRun = usableAnchors.length >= 2 && qlooReady === true && !loading;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);

    fetch('/api/status', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('status unavailable');
        return r.json();
      })
      .then(x => setQlooReady(Boolean(x.qlooConnected)))
      .catch(() => setQlooReady(false))
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
        body:JSON.stringify({anchors:usableAnchors,energy,setting}),
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

  function previewDemo() {
    setError('');
    setResult(demo);
    setSource('demo');
  }

  return <main className="page">
    <header>
      <div className="brand"><span aria-hidden="true">R</span>Resonance</div>
      <div className={qlooReady ? 'status live' : 'status pending'} role="status" aria-live="polite">
        {qlooReady === null ? 'Checking Qloo connection…' : qlooReady ? 'Live Qloo connected' : 'Qloo access pending'}
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
          {anchors.map((a,i)=><label key={i} className="anchorField" htmlFor={`anchor-${i}`}>
            <span>{anchorLabels[i]}</span>
            <input
              id={`anchor-${i}`}
              value={a}
              onChange={e=>setAnchors(v=>v.map((x,j)=>j===i?e.target.value:x))}
              placeholder={anchorLabels[i]}
              autoComplete="off"
              maxLength={100}
            />
          </label>)}
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
        </div>
        <div className="actions">
          <button disabled={!canRun} onClick={runLive}>
            {loading?'Grounding with Qloo…':qlooReady?'Build with live Qloo':'Live Qloo available when key arrives'}
          </button>
          <button className="secondary" onClick={previewDemo} disabled={loading}>Preview interface</button>
        </div>
        <small>
          {qlooReady === null
            ? 'Checking whether the event-issued Qloo credential is connected.'
            : qlooReady
              ? 'Live Qloo is connected. The preview remains available for comparison and is always labeled.'
              : 'The event API credential is still pending. Preview data is illustrative and clearly labeled.'}
        </small>
        {usableAnchors.length < 2 && <div className="validation" role="status">Enter at least two distinct cultural anchors.</div>}
        {error && <div className="error" role="alert">{error}</div>}
      </div>
      <aside className="trace" aria-label="Agent loop">
        <h3>Agent loop</h3>
        <ol><li>Resolve cultural anchors</li><li>Evaluate evidence strength</li><li>Compose for the chosen context</li><li>Explain every recommendation</li></ol>
      </aside>
    </section>

    {result && <section ref={resultRef} tabIndex={-1} className="results" aria-labelledby="result-title">
      <div className="resultTop"><div><h2 id="result-title">{source==='live'?'Your Qloo-grounded session':'Illustrative session preview'}</h2><p>{result.summary}</p></div><b>{source==='live'?'LIVE QLOO':'ILLUSTRATIVE DEMO'}</b></div>
      {source==='demo' && <div className="warning" role="note">Demo mode: these affinities, evidence scores, and rationales are placeholders, not Qloo API results.</div>}

      <h3>Resolved anchors</h3>
      <div className="chips">{result.resolvedAnchors.map(x=><span key={x.urn}>{x.name}</span>)}</div>

      <h3>{source==='live'?'Taste DNA inferred by Qloo':'Illustrative taste-DNA preview'}</h3>
      <div className="affinities">{result.affinities.map(x=><div key={x.label}><span>{x.label}</span><b>{Math.round(x.score*100)}%</b></div>)}</div>

      <section className="decisionTrace" aria-labelledby="decision-trace-title">
        <div>
          <h3 id="decision-trace-title">Agent decision trace</h3>
          <p>The agent exposes the evidence path instead of hiding how the session was assembled.</p>
        </div>
        <div className="evidenceMetrics">
          <span><b>{result.evidence.resolvedAnchorCount}</b> anchors resolved</span>
          <span><b>{result.evidence.selectedAffinityCount}</b> affinities selected</span>
          <span><b>{Math.round(result.evidence.confidence*100)}%</b> mean normalized score</span>
        </div>
        <ol className="agentTraceList">
          {result.agentTrace.map(step=><li key={step.stage} className={step.status}>
            <span>{step.stage}</span>
            <p>{step.detail}</p>
          </li>)}
        </ol>
      </section>

      <div className="plan">{result.plan.map(x=><article key={x.title}><small>{x.duration}</small><h3>{x.title}</h3><p>{x.action}</p><div><b>Why it fits</b><br/>{x.why}</div></article>)}</div>
    </section>}

    <section className="impact"><h2>Personalization without a profile, history, or identity graph.</h2><p>Start from a few real favorites instead of a generic age-based activity list. No personal identifiers are required, and Resonance is not a medical tool.</p></section>
  </main>;
}