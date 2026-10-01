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
  };

  it('marks illustrative exports so they cannot be mistaken for live Qloo evidence', () => {
    const text = formatSessionText(session, 'demo');
    expect(text).toContain('Illustrative demo — not live Qloo data');
    expect(text).toContain('Jazz: Rank #1');
    expect(text).toContain('Musicals: 82%');
  });

  it('keeps category hints visible in copied/printed session text', () => {
    const text = formatSessionText(session, 'live');
    expect(text).toContain('Ella Fitzgerald [Artist]');
    expect(text).toContain("Singin' in the Rain [Film]");
  });

  it('marks verified live exports as Live Qloo', () => {
    expect(formatSessionText(session, 'live')).toContain('Source: Live Qloo');
  });
});
