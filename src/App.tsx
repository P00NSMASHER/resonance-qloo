import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeQlooState, qlooPresentation, qlooStateAfterRecommendationFailure, type QlooUiState } from './lib/connectionState';
import { formatSessionText } from './lib/sessionExport';
import { ANCHOR_TYPE_OPTIONS, anchorTypeLabelFromUrn, anchorTypeUrn, type AnchorType } from './lib/anchorTypes';
import { hasVerifiedLiveProvenance } from './lib/liveProvenance';
import { hasConsistentRecommendationResult, matchesRecommendationRequestContext } from './lib/recommendationResult';
import { payloadHasMatchingRequestContext, type RecommendationRequestContext } from './lib/recommendationContext';
import { buildQlooDelta } from './lib/qlooDelta';
import { planFromTags, selectSessionArchetype } from './lib/qlooLogic';
import deploymentContract from '../deployment-contract.json';

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
  requestContext: RecommendationRequestContext;
  summary: string;
  resolvedAnchors: ResolvedAnchor[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string; anchorName?:string; affinityLabel:string }[];
  agentTrace: AgentTraceStep[];
  evidence: {
    meanNormalizedScore: number|null;
    evidenceBasis: 'normalized-score'|'ranked-order';
    selectedAffinityCount: number;
    returnedAffinityCount: number;
    selectedAffinityLabels: string[];
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
    contractVersion?:string;
    generatedAt?:string;
  };
};

const demo: Result = {
  requestContext: {
    anchors:[
      { query:'Aretha Franklin', typeUrn:'urn:entity:artist' },
      { query:'The Sound of Music', typeUrn:'urn:entity:movie' },
    ],
    energy:'calm',
    setting:'small-group',
    durationMinutes:30,
  },
  summary: 'Illustrative preview only — this is not live Qloo data.',
  resolvedAnchors: [
    { query:'Aretha Franklin', name:'Aretha Franklin', entityId:'demo:aretha', requestedTypeUrn:'urn:entity:artist', resolutionMatch:'exact-name' },
    { query:'The Sound of Music', name:'The Sound of Music', entityId:'demo:sound-of-music', requestedTypeUrn:'urn:entity:movie', resolutionMatch:'exact-name' },
  ],
  affinities: [
    { label:'Entertainment', score:null, rank:1 },
    { label:'soul', score:null, rank:2 },
    { label:'funk', score:null, rank:3 },
    { label:'rhythm & blues', score:null, rank:4 },
  ],
  plan: [
    { title:'Opening cue', duration:'5 min', action:'Open with a familiar Aretha Franklin track and invite a low-pressure choice between two songs.', why:'Illustrative rationale showing how a known favorite can anchor the session.', anchorName:'Aretha Franklin', affinityLabel:'Entertainment' },
    { title:'Story bridge', duration:'10 min', action:'Use The Sound of Music as a prompt for favorite songs, performers, theaters, or family viewing memories.', why:'Illustrative rationale showing a film-to-musical-storytelling bridge.', anchorName:'The Sound of Music', affinityLabel:'soul' },
    { title:'Shared choice', duration:'10 min', action:'Offer simple music or movement choices connected to funk and let the group steer the next activity.', why:'Illustrative rationale preserving participant choice while branching into adjacent culture.', affinityLabel:'funk' },
    { title:'Closing ritual', duration:'5 min', action:'Close with a favorite-vocalist prompt connected to rhythm & blues and ask what music or film should return next time.', why:'Illustrative rationale for ending in the same cultural neighborhood.', affinityLabel:'rhythm & blues' },
  ],
  agentTrace: [
    { stage:'resolve', status:'ok', detail:'Illustrative: both example anchors are exact-name matches.' },
    { stage:'evaluate', status:'ok', detail:'Illustrative: retain the first four example ranked signals without manufacturing percentages.' },
    { stage:'compose', status:'ok', detail:'Illustrative: adapt four activities to the selected session context.' },
    { stage:'explain', status:'ok', detail:'Illustrative: attach a visible rationale to every activity.' },
  ],
  evidence: {
    meanNormalizedScore:null,
    evidenceBasis:'ranked-order',
    selectedAffinityCount:4,
    returnedAffinityCount:4,
    selectedAffinityLabels:['Entertainment','soul','funk','rhythm & blues'],
    resolvedAnchorCount:2,
    exactResolutionCount:2,
    topResultResolutionCount:0,
    categoryHintCount:2,
    explainabilityResultCount:0,
    aggregateExplainabilityAvailable:false,
    sessionDurationMinutes:30,
    energy:'calm',
    setting:'small-group',
  },
  provenance: {
    source:'illustrative-demo',
  },
};

const anchorExamples = ['Favorite artist', 'Favorite film', 'Favorite food, brand, book, or place', 'Another favorite'];
function demoForContext(energy:string, setting:string, durationMinutes:number): Result {
  return {
    ...demo,
    requestContext:{...demo.requestContext,energy,setting,durationMinutes},
    plan:planFromTags(demo.affinities,energy,setting,['Aretha Franklin','The Sound of Music'],durationMinutes),
    evidence:{...demo.evidence,sessionDurationMinutes:durationMinutes,energy,setting},
  };
}

function activitySupport(index:number) {
  const support = [
    {materials:'Two cue options: one image or object and one short audio excerpt.',participation:'Invite listening, pointing, choosing, speaking, or passing.'},
    {materials:'Three printed scene, lyric, headline, or image cards.',participation:'Offer a spoken choice, a point-to-choice option, and quiet observation.'},
    {materials:'Paper, thick markers, and two prepared visual or rhythm choices.',participation:'Participants may choose, place, tap, gesture, contribute words, or observe.'},
    {materials:'Two large-print closing prompts or voting cards.',participation:'Accept a word, gesture, point, or pass; never require recall.'},
  ];
  return support[index] ?? support[2];
}

function replacementActivity(index:number, item:Result['plan'][number]) {
  const signal = item.affinityLabel;
  const anchor = item.anchorName ?? 'the familiar favorite';
  return [
    `Place an image cue and a short audio cue connected to “${signal}” side by side. Let participants choose one by pointing, listening, speaking, or passing.`,
    `Lay out three scene, image, or lyric cards connecting “${anchor}” with “${signal}.” Invite the group to sort, match, or simply select one card to discuss.`,
    `Create a one-page group collage or rhythm pattern inspired by “${signal}.” Each person may choose, place, tap, gesture, contribute a word, or observe.`,
    `Close with a two-card vote connected to “${signal}”: revisit it next time or choose a different direction. Accept a word, point, gesture, or pass.`,
  ][index] ?? `Offer a visual matching activity connected to “${signal},” with speaking, pointing, observing, and passing all treated as valid participation.`;
}

function formatAffinityScore(score:number) {
  return `${(score * 100).toFixed(2)}%`;
}

const STATUS_REQUEST_TIMEOUT_MS = 12_000;
const LIVE_REQUEST_TIMEOUT_MS = 28_000;

export default function App() {
  const [anchors, setAnchors] = useState(['Ella Fitzgerald','Roman Holiday']);
  const [anchorTypes, setAnchorTypes] = useState<AnchorType[]>(['artist','movie']);
  const [energy, setEnergy] = useState('calm');
  const [setting, setSetting] = useState('small-group');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [qlooState, setQlooState] = useState<QlooUiState>('checking');
  const [qlooApiOrigin, setQlooApiOrigin] = useState('');
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [source, setSource] = useState<'live'|'demo'|null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activityDecisions, setActivityDecisions] = useState<Record<number,'kept'|'modified'|'replaced'>>({});
  const [activityEdits, setActivityEdits] = useState<Record<number,string>>({});
  const [editingActivity, setEditingActivity] = useState<number | null>(null);
  const [resolutionReview, setResolutionReview] = useState<ResolvedAnchor[] | null>(null);
  const [resolutionReviewToken, setResolutionReviewToken] = useState('');
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
  const selectedAffinitySequence = result?.evidence.selectedAffinityLabels ?? [];
  const selectedAffinityLabels = new Set<string>(selectedAffinitySequence);
  const selectedAffinityOrder = new Map<string, number>(
    selectedAffinitySequence.map((label,index) => [label,index + 1]),
  );
  const qlooDelta = result ? buildQlooDelta(
    result.requestContext,
    result.affinities,
    result.evidence.selectedAffinityLabels,
    result.plan,
  ) : null;
  const sessionArchetype = result ? selectSessionArchetype(result.affinities.filter(item => result.evidence.selectedAffinityLabels.includes(item.label)), result.evidence.energy, result.evidence.setting) : null;
  const approvedCount = result ? result.plan.filter((_,index) => Boolean(activityDecisions[index])).length : 0;
  const keptCount = Object.values(activityDecisions).filter(value => value === 'kept').length;
  const modifiedCount = Object.values(activityDecisions).filter(value => value === 'modified').length;
  const replacedCount = Object.values(activityDecisions).filter(value => value === 'replaced').length;

  useEffect(() => {
    setQlooState('checking');
    setQlooApiOrigin('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), STATUS_REQUEST_TIMEOUT_MS);

    fetch(statusRefreshKey > 0 ? '/api/status?refresh=1' : '/api/status', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('status unavailable');
        return r.json();
      })
      .then(x => {
        const nextState = normalizeQlooState(x);
        const origin = typeof x?.qlooApiOrigin === 'string' ? x.qlooApiOrigin : '';
        const contractMatches = x?.contractVersion === deploymentContract.version;
        setQlooApiOrigin(contractMatches ? origin : '');
        setQlooState(!contractMatches || (nextState === 'ready' && !origin) ? 'degraded' : nextState);
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
  }, [statusRefreshKey]);

  useEffect(() => {
    if (result) window.requestAnimationFrame(() => resultRef.current?.focus());
  }, [result]);

  useEffect(() => {
    setResolutionReview(null);
    setResolutionReviewToken('');
  }, [anchors,anchorTypes]);

  async function runLive(confirmedEntityIds: string[] = [], reviewToken = '') {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSource(null);
    if (!confirmedEntityIds.length) {
      setResolutionReview(null);
      setResolutionReviewToken('');
    }

    const requestContext: RecommendationRequestContext = {
      anchors:usableAnchors.map(item => ({
        query:item.query,
        typeUrn:anchorTypeUrn(item.type),
      })),
      energy,
      setting,
      durationMinutes,
    };

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIVE_REQUEST_TIMEOUT_MS);

    try {
      const r = await fetch('/api/recommend', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          anchors:usableAnchors,
          energy,
          setting,
          durationMinutes,
          confirmedEntityIds,
          ...(reviewToken ? { reviewToken } : {}),
        }),
        signal:controller.signal
      });
      const data = await r.json();
      if (
        r.status === 409 &&
        data?.code === 'QLOO_RESOLUTION_REVIEW_REQUIRED' &&
        Array.isArray(data.resolvedAnchors) &&
        typeof data.reviewToken === 'string' &&
        data.reviewToken.length > 0 &&
        data.reviewToken.length <= 128 &&
        data.contractVersion === deploymentContract.version
      ) {
        if (!payloadHasMatchingRequestContext(data, requestContext)) {
          setQlooState('degraded');
          throw new Error('Qloo review response did not match the submitted session context. Please retry.');
        }
        setResolutionReview(data.resolvedAnchors);
        setResolutionReviewToken(data.reviewToken);
        return;
      }
      if (!r.ok) {
        const nextQlooState = qlooStateAfterRecommendationFailure(r.status, data?.error);
        if (nextQlooState) setQlooState(nextQlooState);
        throw new Error(data.error || 'Qloo request failed');
      }
      if (!hasConsistentRecommendationResult(data)) {
        setQlooState('degraded');
        throw new Error('Live Qloo response did not match the expected evidence contract. Please retry.');
      }
      if (!matchesRecommendationRequestContext(data, requestContext)) {
        setQlooState('degraded');
        throw new Error('Live Qloo response did not match the submitted session context. Please retry.');
      }
      if (!hasVerifiedLiveProvenance(data, qlooApiOrigin, deploymentContract.version)) {
        setQlooState('degraded');
        throw new Error('Live Qloo provenance could not be verified. Please retry after the connection status refreshes.');
      }
      setResolutionReview(null);
      setResolutionReviewToken('');
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
    setResolutionReviewToken('');
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

  function loadJudgeExample() {
    invalidateGeneratedState();
    setError('');
    setAnchors(['Ella Fitzgerald','Roman Holiday']);
    setAnchorTypes(['artist','movie']);
    setEnergy('calm');
    setSetting('small-group');
    setDurationMinutes(30);
  }

  function previewDemo() {
    setError('');
    setResolutionReview(null);
    setAnchors(['Aretha Franklin','The Sound of Music']);
    setAnchorTypes(['artist','movie']);
    setResult(demoForContext(energy,setting,durationMinutes));
    setSource('demo');
  }

  async function copySession() {
    if (!result || !source) return;
    try {
      const reviewedResult = {...result, plan:result.plan.map((item,index)=>({...item,action:activityEdits[index]??item.action}))};
      const reviewLines = result.plan.flatMap((item,index)=>[
        `- ${item.title}: ${activityDecisions[index]??'not reviewed'}`,
        `  Materials: ${activitySupport(index).materials}`,
        `  Participation options: ${activitySupport(index).participation}`,
      ]);
      await navigator.clipboard.writeText(`${formatSessionText(reviewedResult, source)}\n\nSafety preflight: Check facility policy and any relevant food, swallowing, allergy, mobility, fall, or sensory requirements without entering health data in Resonance. Use seated, non-food, or quiet alternatives when needed.\n\nFacilitator decisions:\n${reviewLines.join('\n')}`);
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
    setActivityDecisions({});
    setActivityEdits({});
    setEditingActivity(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <main className="page" data-deployment-contract={deploymentContract.version}>
    <header className="siteHeader nav">
      <a href="/" className="brand brandLink" aria-label="Resonance home"><img className="brandIcon brandMark" src="/brand/resonance-connection-emblem.png" alt="" width="48" height="48"/><span className="brandType brandName">Resonance<small>Culture becomes connection</small></span></a>
      <nav className="navLinks" aria-label="Main navigation">
        <a href="#explore-culture">Explore culture</a>
        <a href="#how-it-works">How it works</a>
        <a href="#build-session" className="navCTA">Start a session</a>
      </nav>
      <div className="navRight">
        <span className="hackathonBadge">Qloo Agent Hackathon</span>
        <div className={`status ${qlooState === 'ready' ? 'live' : qlooState === 'degraded' ? 'degraded' : 'pending'}`} role="status" aria-live="polite">
          {qlooUi.label}
        </div>
      </div>
    </header>

    <section className="hero brandedHero" aria-labelledby="hero-title">
      <div className="heroContent">
        <div className="eyebrow">THE ART OF MEANINGFUL CONNECTION</div>
        <h1 id="hero-title">Culture becomes <em>connection.</em></h1>
        <p className="heroCopy">A favorite song. A beloved film. A place that matters. Explore cultural connections through Qloo, then shape four activities into a session you can make your own.</p>
        <div className="heroActions"><a className="heroCTA" href="#build-session">Create a cultural session <span aria-hidden="true">→</span></a><small className="heroAside">Discovery powered by Qloo. Every choice guided by you.</small></div>
        <div className="heroProof proofRow"><span>Transparent evidence</span><span>Human-led choices</span><span>No clinical claims</span></div>
      </div>
      <div className="heroVisual">
        <img className="heroArtwork" src="/brand/resonance-culture-collage.png" alt="Colorful editorial collage celebrating music, cinema, books, and travel." width="1672" height="941" fetchPriority="high"/>
        <div className="heroCaption"><span>01 / DISCOVER</span><strong>Every favorite starts a story.</strong></div>
        <div className="heroFloatingNote"><span aria-hidden="true">✦</span><div><b>A little familiarity.</b><small>A whole world to discover.</small></div></div>
      </div>
    </section>

    <section id="explore-culture" className="cultureSection">
      <header className="cultureHeading">
        <div><span className="sectionKicker">FOLLOW WHAT YOU LOVE</span><h2>One favorite. Endless possibilities.</h2></div>
        <p>Music, films, stories, and places. Start somewhere familiar and see where the connections lead.</p>
      </header>
      <div className="cultureGrid">
        <a href="#build-session" className="cultureCard" data-culture="music">
          <div className="cultureImage"><img src="/brand/resonance-music.png" width="1672" height="941" loading="lazy" decoding="async" alt="Walnut turntable, vinyl records, and a teal armchair in a warm listening room."/><span className="cultureNumber">01</span></div>
          <div className="cultureCardBody"><span>MUSIC</span><h3>Songs worth sharing <span aria-hidden="true">→</span></h3><p>Bring a favorite artist into the conversation, then explore connections.</p></div>
        </a>
        <a href="#build-session" className="cultureCard" data-culture="cinema">
          <div className="cultureImage"><img src="/brand/resonance-cinema.png" width="1672" height="941" loading="lazy" decoding="async" alt="Art deco cinema with coral velvet seats, teal walls, and warm brass lights."/><span className="cultureNumber">02</span></div>
          <div className="cultureCardBody"><span>CINEMA</span><h3>Follow the story <span aria-hidden="true">→</span></h3><p>Begin with a beloved film and explore its cultural connections.</p></div>
        </a>
        <a href="#build-session" className="cultureCard" data-culture="stories">
          <div className="cultureImage"><img src="/brand/resonance-stories.png" width="1672" height="940" loading="lazy" decoding="async" alt="An open book, colorful clothbound volumes, lavender, and a teal cup in afternoon sunlight."/><span className="cultureNumber">03</span></div>
          <div className="cultureCardBody"><span>STORIES</span><h3>Turn the page <span aria-hidden="true">→</span></h3><p>Let a favorite book become a starting point for conversation.</p></div>
        </a>
        <a href="#build-session" className="cultureCard" data-culture="places">
          <div className="cultureImage"><img src="/brand/resonance-places.png" width="1672" height="941" loading="lazy" decoding="async" alt="Sunlit Mediterranean lane with flowering bougainvillea and a distant sea view."/><span className="cultureNumber">04</span></div>
          <div className="cultureCardBody"><span>PLACES</span><h3>Places that matter <span aria-hidden="true">→</span></h3><p>A familiar place can be the beginning of a conversation.</p></div>
        </a>
      </div>
    </section>

    <section className="builderIntro">
      <span className="sectionKicker">CREATE A CULTURAL SESSION</span>
      <h2>Start with what speaks to you.</h2>
      <p>A few favorites. A little context. A session to make your own.</p>
    </section>

    <section id="build-session" className="workspace" aria-label="Resonance session builder">
      <div className="card formPanel">
        <div className="panelTop"><div><span className="step">01</span><h2>Your favorites, your starting point.</h2></div></div>
        <p className="fieldHint hint">Add two to four favorites, then choose the mood, setting, and time. No names or personal health information needed.</p>
        <div className="inputs anchorGrid">
          {anchors.map((anchor,index)=><div className="anchorGroup anchorCard" key={index}>
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
        <div className="selects selectGrid">
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
        <div className="actions actionRow">
          <button className="runButton" disabled={!canRun} onClick={()=>runLive()}>
            {loading?'Grounding with Qloo…':qlooUi.liveReady?'Build with live Qloo':'Live Qloo unavailable'}
          </button>
          <button className="secondary demoButton" onClick={loadJudgeExample} disabled={loading}>Fill judge example</button>
          <button className="secondary demoButton" onClick={previewDemo} disabled={loading}>Preview with example data</button>
        </div>
        <small>{qlooUi.helper}</small>
        {(qlooState === 'degraded' || qlooState === 'rate-limited') && <button
          type="button"
          className="connectionRetry"
          disabled={loading}
          onClick={()=>setStatusRefreshKey(current => current + 1)}
        >Retry Qloo verification</button>}
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
            <button type="button" disabled={loading || !resolutionReviewToken} onClick={()=>runLive(resolutionReview.filter(item => item.resolutionMatch === 'top-result').map(item => item.entityId), resolutionReviewToken)}>Confirm matches & build</button>
            <button type="button" className="secondary" disabled={loading} onClick={()=>{setResolutionReview(null);setResolutionReviewToken('')}}>Edit anchors instead</button>
          </div>
        </section>}
      </div>
      <aside id="how-it-works" className="trace tracePanel" aria-label="Agent loop">
        <span className="step">AGENT TRACE</span>
        <h3>From a favorite to a shared moment.</h3>
        <ol><li><span>1</span><div><b>Resolve</b><small>Resolve anchors to Qloo entity IDs; non-exact matches stop for review.</small></div></li><li><span>2</span><div><b>Evaluate</b><small>Select real numeric scores when present, otherwise preserve Qloo rank order.</small></div></li><li><span>3</span><div><b>Compose</b><small>Map selected evidence into the chosen setting, energy, and duration.</small></div></li><li><span>4</span><div><b>Explain</b><small>Expose the evidence path and rationale for every activity.</small></div></li></ol>
        <img className="traceArtwork" src="/brand/resonance-cultural-atlas.png" alt="Editorial arrangement of a vinyl record, film frames, an open book and a travel map connected by flowing teal ribbons." width="1024" height="576" loading="lazy" decoding="async"/>
        <p className="traceFootnote">Every recommendation comes with its evidence.</p>
      </aside>
    </section>

    {result && qlooDelta && <section ref={resultRef} tabIndex={-1} className="results" aria-labelledby="result-title">
      <div className="resultTop">
        <div>
          <span className={source === 'live' ? 'sourcePill live' : 'sourcePill demo'}>{source === 'live' ? 'LIVE QLOO' : 'ILLUSTRATIVE DEMO'}</span>
          <h2 id="result-title">{source==='live'?'Your Qloo-grounded session':'Illustrative session preview'}</h2>
          <p>{source === 'live' ? 'Start with the outcome. Open the audit trail only when you want the full evidence path.' : result.summary}</p>
        </div>
      </div>
      <div className="resultActions" aria-label="Session actions">
        <button type="button" className="secondary" onClick={copySession}>{copied ? 'Copied' : 'Copy session'}</button>
        <button type="button" className="secondary" onClick={()=>window.print()}>Print</button>
        <button type="button" className="secondary" onClick={startOver}>Start over</button>
        <span className="copyStatus" role="status" aria-live="polite">{copied ? 'Session copied to clipboard.' : ''}</span>
      </div>
      {source==='demo' && <div className="warning" role="note">Demo mode: these affinity ranks and rationales are placeholders, not Qloo API results.</div>}

      <section className="judgeJourney" aria-label="Favorites to Qloo discoveries to session">
        <article>
          <span className="journeyNumber">1</span>
          <b>Your favorites</b>
          <div className="journeyChips">{result.resolvedAnchors.map(x=><span key={x.entityId}>{x.name}</span>)}</div>
        </article>
        <i aria-hidden="true">→</i>
        <article>
          <span className="journeyNumber">2</span>
          <b>What Qloo discovered</b>
          <div className="journeyChips qloo">{selectedAffinitySequence.map((label,index)=><span key={label}>#{index+1} {label}</span>)}</div>
          <small>{result.evidence.returnedAffinityCount} Qloo signals returned · {result.evidence.selectedAffinityCount} selected</small>
        </article>
        <i aria-hidden="true">→</i>
        <article>
          <span className="journeyNumber">3</span>
          <b>Your session</b>
          <strong>{result.plan.length} activities</strong>
          <small>{result.evidence.sessionDurationMinutes} minutes · {result.evidence.energy} · {result.evidence.setting}</small>
        </article>
      </section>

      <section className="qlooDelta" aria-labelledby="qloo-delta-title">
        <header>
          <b>Why Qloo matters</b>
          <h3 id="qloo-delta-title">{source === 'live' ? 'How Qloo changed this session' : 'How Qloo would change this session'}</h3>
          <p>The baseline below is intentionally competent but limited: it can use only the favorites and category hints you supplied. It does not invent adjacent tastes.</p>
        </header>
        <div className="comparisonGrid">
          <article className="baselineCard">
            <span>Without Qloo · anchor-only baseline</span>
            <ul>{qlooDelta.baseline.map(item=><li key={item.anchor}>{item.action}</li>)}</ul>
            <small>Useful, but confined to what was already typed.</small>
          </article>
          <article className="withQlooCard">
            <span>{source === 'live' ? 'With Qloo · live taste graph' : 'With Qloo · illustrative path'}</span>
            <p>{source === 'live'
              ? `Qloo expanded the literal inputs into ${result.evidence.returnedAffinityCount} cross-category signals, selected ${result.evidence.selectedAffinityCount}, and grounded every activity in that additional evidence.`
              : `The illustrative path shows how adjacent cultural evidence can expand literal favorites into a broader session.`
            }</p>
            <div className="deltaSignals">{selectedAffinitySequence.map(label=><span key={label}>{label}</span>)}</div>
          </article>
        </div>
        <div className="deltaMetrics" aria-label="Qloo incremental value">
          <span><strong>{qlooDelta.inputAnchorCount}</strong> favorites supplied</span>
          <span><strong>{qlooDelta.returnedSignalCount}</strong> Qloo signals discovered</span>
          <span><strong>{qlooDelta.selectedSignalCount}</strong> signals selected</span>
          <span><strong>{qlooDelta.activitiesInfluencedCount}</strong> activities influenced</span>
          <span><strong>{qlooDelta.selectedSignalsNotNamedInInputs.length}</strong> selected discoveries not named in the inputs</span>
        </div>
      </section>

      <section className="sessionSection" aria-labelledby="session-title">
        <div className="sectionHeading">
          <b>03 · Your session</b>
          <h3 id="session-title">A facilitator-ready starting point</h3>
          {sessionArchetype && <p className="archetypeLine"><strong>{sessionArchetype}</strong> · strategy selected from Qloo evidence; session context breaks ties</p>}
        </div>
        <div className="plan">{result.plan.map((x,index)=>{const signalNumber=x.affinityLabel ? selectedAffinityOrder.get(x.affinityLabel) : undefined;const displayedAction=activityEdits[index] ?? x.action;const decision=activityDecisions[index];return <article key={x.title} className={decision ? `facilitator-${decision}` : ''}>
          <small>{x.duration}</small>
          <h3>{x.title}</h3>
          {editingActivity === index ? <div className="activityEditor"><label htmlFor={`activity-edit-${index}`}>Modify activity</label><textarea id={`activity-edit-${index}`} value={displayedAction} onChange={event=>setActivityEdits(current=>({...current,[index]:event.target.value}))}/><div><button type="button" onClick={()=>{setActivityDecisions(current=>({...current,[index]:'modified'}));setEditingActivity(null)}}>Save modification</button><button type="button" className="secondary" onClick={()=>setEditingActivity(null)}>Cancel</button></div></div> : <p className="sessionAction">{displayedAction}</p>}
          <div className="activitySupport"><span><b>Why this fits</b>{x.why}</span><span><b>Materials</b>{activitySupport(index).materials}</span><span><b>Participation options</b>{activitySupport(index).participation}</span></div>
          {x.affinityLabel && <div className="sessionSignal">{decision==='modified'?'Original evidence reference':signalNumber ? `Qloo signal #${signalNumber}` : 'Qloo signal'} · {x.affinityLabel}{x.anchorName ? ` · paired with ${x.anchorName}` : ''}{decision==='modified'&&<small>Facilitator-authored text is not revalidated or attributed to Qloo.</small>}{decision==='replaced'&&<small>Resonance changed the participation modality while retaining this original signal.</small>}</div>}
          <div className="facilitatorControls" aria-label={`Facilitator controls for ${x.title}`}>
            <button type="button" aria-pressed={decision==='kept'} className={decision==='kept'?'active':''} onClick={()=>setActivityDecisions(current=>({...current,[index]:'kept'}))}>Keep</button>
            <button type="button" aria-pressed={decision==='modified'} className={decision==='modified'?'active':''} onClick={()=>{setActivityEdits(current=>({...current,[index]:current[index]??x.action}));setEditingActivity(index)}}>Modify</button>
            <button type="button" aria-pressed={decision==='replaced'} className={decision==='replaced'?'active':''} onClick={()=>{setActivityEdits(current=>({...current,[index]:replacementActivity(index,x)}));setActivityDecisions(current=>({...current,[index]:'replaced'}));setEditingActivity(null)}}>Replace</button>
          </div>
          {decision && <div className="decisionBadge">Facilitator: {decision}</div>}
        </article>})}</div>
        <div className="approvalSummary" role="status" aria-live="polite"><strong>Facilitator review</strong><span>{approvedCount}/{result.plan.length} activities have a decision · {keptCount} kept · {modifiedCount} modified · {replacedCount} replaced</span>{approvedCount===result.plan.length && <b>All activity decisions complete</b>}</div>
      </section>

      <div className="interpretationLimit" role="note">
        <b>Interpretation limit</b>
        <span>Qloo affinities describe aggregate cultural relationships, not a probability or claim about this individual. The facilitator can keep, modify, or replace every suggestion before use.</span>
        <span><b>Safety preflight:</b> Check facility policy and relevant food, swallowing, allergy, mobility, fall, or sensory requirements. Use seated, non-food, or quiet alternatives when needed; do not enter health data here.</span>
      </div>

      <details className="auditTrail">
        <summary>View evidence &amp; audit trail</summary>
        <div className="auditIntro">
          <h3>Full Qloo evidence path</h3>
          <p>Technical provenance is preserved here without competing with the primary session experience.</p>
        </div>
        <div className="resultMeta" aria-label="Result provenance and evidence">
          <span className={source === 'live' ? 'metaLive' : 'metaDemo'}><b>Source</b>{source === 'live' ? 'LIVE QLOO' : 'ILLUSTRATIVE DEMO'}</span>
          <span><b>Evidence</b>{result.evidence.evidenceBasis === 'ranked-order' ? 'Ranked Qloo order' : 'Normalized Qloo score'}</span>
          <span><b>Request receipt</b>{result.requestContext.anchors.length} anchors · {result.requestContext.energy} · {result.requestContext.setting} · {result.requestContext.durationMinutes} min</span>
          {source === 'live' && result.provenance.apiOrigin && <span><b>Qloo API</b>{result.provenance.apiOrigin.replace(/^https:\/\//,'')}</span>}
          <span><b>Contract</b>{result.provenance.contractVersion ?? deploymentContract.version}</span>
          <span><b>{result.provenance.generatedAt ? 'Generated' : 'Timestamp'}</b>{result.provenance.generatedAt ? new Date(result.provenance.generatedAt).toLocaleString() : 'Static example · no live timestamp'}</span>
        </div>

        <section className="evidenceBridge" aria-labelledby="evidence-bridge-title">
          <div className="evidenceColumn">
            <div className="evidenceHeading"><b>Input evidence</b><h3 id="evidence-bridge-title">Resolved favorites</h3></div>
            <div className="chips">{result.resolvedAnchors.map(x=><span key={x.entityId}><strong>{x.name}</strong>{x.requestedTypeUrn && <em>{anchorTypeLabelFromUrn(x.requestedTypeUrn) ?? x.requestedTypeUrn}</em>}<em className={x.resolutionMatch === 'exact-name' ? 'matchExact' : source === 'live' ? 'matchConfirmed' : 'matchReview'}>{x.resolutionMatch === 'exact-name' ? 'Exact name' : source === 'live' ? 'Qloo top match · confirmed' : 'Qloo top match · review'}</em><code className="entityId" title={x.entityId}>{source === 'live' ? 'Qloo ID' : 'Demo ID'} · {x.entityId}</code></span>)}</div>
            {result.evidence.topResultResolutionCount > 0 && <div className="resolutionNote" role="note"><b>{source === 'live' ? 'Top matches confirmed' : 'Review entity matches'}</b><span>{source === 'live' ? `${result.evidence.topResultResolutionCount} non-exact Qloo top-result match${result.evidence.topResultResolutionCount === 1 ? '' : 'es'} were explicitly confirmed before taste analysis.` : `${result.evidence.topResultResolutionCount} resolved anchor${result.evidence.topResultResolutionCount === 1 ? '' : 's'} used Qloo's top returned entity without an exact name match.`}</span></div>}
          </div>
          <div className="evidenceHandoff"><span>sent together to</span><strong>Qloo taste analysis</strong><i aria-hidden="true">→</i></div>
          <div className="evidenceColumn">
            <div className="evidenceHeading"><div><b>{source === 'live' ? 'Qloo output evidence' : 'Illustrative output evidence'}</b><h3>{source==='live'?'All retained taste signals':'Example taste signals'}</h3></div><span className="signalCount"><strong>{result.evidence.selectedAffinityCount}</strong> selected / <strong>{result.evidence.returnedAffinityCount}</strong> returned</span></div>
            <div className="selectionRule"><b>Selection rule</b><span>{source === 'demo' ? `Illustrative: select the first ${result.evidence.selectedAffinityCount} signals from the example rank order.` : result.evidence.evidenceBasis === 'normalized-score' ? `Select up to ${result.evidence.selectedAffinityCount} highest numeric Qloo affinities. Returned scores determine the order.` : `Qloo did not supply enough numeric scores, so preserve its returned affinity order and select the first ${result.evidence.selectedAffinityCount}. No percentage is invented.`}</span></div>
            {result.evidence.selectedAffinityCount < result.plan.length && <div className="evidenceReuseNote" role="note"><b>No synthetic signal</b><span>Only {result.evidence.selectedAffinityCount} real selected signals support {result.plan.length} activities, so the last real signal is reused for the closing step instead of inventing another one.</span></div>}
            <div className="affinities">{result.affinities.map(x=>{const selected=selectedAffinityLabels.has(x.label);const signalNumber=selectedAffinityOrder.get(x.label);return <div key={x.label} className={selected ? 'selected' : 'supporting'}><small>{selected ? `Plan signal #${signalNumber}` : 'Additional evidence'}</small><span>{x.label}</span><b>{x.score === null ? `Rank #${x.rank}` : formatAffinityScore(x.score)}</b></div>})}</div>
          </div>
        </section>

        <section className="decisionTrace" aria-labelledby="decision-trace-title">
          <div><h3 id="decision-trace-title">Agent decision trace</h3><p>The audit trail exposes how the session was assembled.</p></div>
          <div className="evidenceMetrics">
            <span><b>{result.evidence.resolvedAnchorCount}</b> anchors resolved</span>
            <span><b>{result.evidence.exactResolutionCount}</b> exact-name matches</span>
            <span><b>{result.evidence.topResultResolutionCount}</b>{source === 'live' ? ' top matches confirmed' : ' top matches to review'}</span>
            <span><b>{result.evidence.categoryHintCount}</b> category hints</span>
            <span><b>{result.evidence.selectedAffinityCount}</b> signals selected</span>
            <span><b>{result.evidence.returnedAffinityCount}</b> signals returned</span>
            <span><b>{source === 'live' ? result.evidence.explainabilityResultCount : '—'}</b>{source === 'live' ? ' Qloo-explained results' : ' live explainability'}</span>
            <span><b>{result.evidence.aggregateExplainabilityAvailable ? 'Yes' : 'No'}</b> aggregate explainability</span>
          </div>
          <ol className="agentTraceList">{result.agentTrace.map(step=><li key={step.stage} className={step.status}><span>{step.stage}</span><p>{step.detail}</p></li>)}</ol>
        </section>

        <section className="auditRationales" aria-label="Detailed activity rationale">
          <h3>Activity-to-evidence mapping</h3>
          {result.plan.map(x=>{const signalNumber=x.affinityLabel ? selectedAffinityOrder.get(x.affinityLabel) : undefined;return <article key={x.title}>
            <b>{x.title}</b>
            <code>{signalNumber ? `Signal #${signalNumber}: ` : ''}{x.anchorName ? `${x.anchorName} + ${x.affinityLabel} → ${x.title}` : `${x.affinityLabel} → ${x.title}`}</code>
            <p>{x.why}</p>
          </article>})}
        </section>
      </details>
    </section>}

    <section className="impactStory">
      <figure className="connectionVisual">
        <img src="/brand/resonance-connection.png" width="1672" height="941" loading="lazy" decoding="async" alt="Illustrative scene of people sharing a cultural activity."/>
        <figcaption>Illustrative artwork · not participant photography</figcaption>
      </figure>
      <div className="impactContent">
        <span className="sectionKicker">MADE FOR HUMAN CONNECTION</span>
        <h2>Make room for a meaningful moment.</h2>
        <p>A session begins with familiar favorites and takes shape through your judgment. See what Qloo discovered, review each activity, and keep, modify, or replace any suggestion before sharing the plan.</p>
        <div className="impactStats"><div><strong>2–4</strong><span>favorites to begin</span></div><div><strong>4</strong><span>activities to shape</span></div><div><strong>You</strong><span>decide what fits</span></div></div>
        <a className="storyCTA" href="#build-session">Find your next connection <span aria-hidden="true">→</span></a>
      </div>
    </section>
    <footer><span>Resonance</span><span>Built for the Qloo Agent Hackathon · Cultural guidance, not medical advice.</span></footer>
  </main>;
}
