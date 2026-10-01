import { describe, expect, it } from 'vitest';
import { formatSessionText } from './sessionExport';

describe('session export', () => {
  const session = {
    summary:'A grounded session.',
    resolvedAnchors:[
      {name:'Ella Fitzgerald',requestedTypeUrn:'urn:entity:artist'},
      {name:"Singin' in the Rain",requestedTypeUrn:'urn:entity:movie'}
    ],
    affinities:[
      {label:'Jazz',score:null,rank:1},
      {label:'Musicals',score:.82,rank:2},
    ],
    plan:[
      {title:'Opening cue',duration:'10 min',action:'Play a familiar song.',why:'Qloo-ranked evidence.'},
      {title:'Story bridge',duration:'15 min',action:'Invite a story.',why:'Related cultural signal.'},
      {title:'Shared choice',duration:'15 min',action:'Offer choices.',why:'Preserves agency.'},
      {title:'Closing ritual',duration:'10 min',action:'Close gently.',why:'Keeps continuity.'},
    ],
    provenance:{generatedAt:'2026-10-01T17:12:00.000Z'},
    evidence:{
      evidenceBasis:'ranked-order' as const,
      explainabilityResultCount:2,
      aggregateExplainabilityAvailable:true,
    },
  };

  it('marks illustrative exports so they cannot be mistaken for live Qloo evidence', () => {
    const text = formatSessionText(session, 'demo');
    expect(text).toContain('Illustrative demo — not live Qloo data');
    expect(text).not.toContain('Generated:');
    expect(text).toContain('Jazz: Rank #1');
    expect(text).toContain('Musicals: 82%');
  });

  it('keeps category hints visible in copied/printed session text', () => {
    const text = formatSessionText(session, 'live');
    expect(text).toContain('Ella Fitzgerald [Artist]');
    expect(text).toContain("Singin' in the Rain [Film]");
  });

  it('keeps the live generation timestamp in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain('Generated: 2026-10-01T17:12:00.000Z');
  });

  it('keeps the live evidence basis in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain('Evidence basis: Qloo ranked result order');
  });

  it('keeps live Qloo explainability status in exported evidence', () => {
    expect(formatSessionText(session, 'live')).toContain(
      'Qloo explainability: 2 result(s) with attribution metadata; aggregate metadata present'
    );
    expect(formatSessionText(session, 'demo')).not.toContain('Qloo explainability:');
  });

  it('marks verified live exports as Live Qloo', () => {
    expect(formatSessionText(session, 'live')).toContain('Source: Live Qloo');
  });
});
