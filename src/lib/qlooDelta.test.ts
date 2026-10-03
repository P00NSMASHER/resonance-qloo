import { describe, expect, it } from 'vitest';
import { buildAnchorOnlyBaseline, buildQlooDelta } from './qlooDelta';

const context = {
  anchors:[
    { query:'Ella Fitzgerald', typeUrn:'urn:entity:artist' },
    { query:"Singin' in the Rain", typeUrn:'urn:entity:movie' },
  ],
  energy:'calm',
  setting:'small-group',
  durationMinutes:30,
};

describe('Qloo delta', () => {
  it('builds a competent literal baseline without adjacent taste claims', () => {
    const baseline = buildAnchorOnlyBaseline(context);
    expect(baseline).toHaveLength(2);
    expect(baseline[0].action).toContain('Ella Fitzgerald');
    expect(baseline[0].action).toContain('play or discuss');
    expect(baseline[1].action).toContain("Singin' in the Rain");
    expect(baseline[1].action).toContain('scene');
    expect(baseline.map(item => item.action).join(' ')).not.toContain('Jazz');
  });

  it('quantifies only selected signals not literally named in the inputs', () => {
    const delta = buildQlooDelta(
      context,
      [{label:'Jazz'},{label:'swing'},{label:'Ella Fitzgerald'}],
      ['Jazz','swing','Ella Fitzgerald'],
      [
        {affinityLabel:'Jazz'},
        {affinityLabel:'swing'},
        {affinityLabel:'Ella Fitzgerald'},
        {affinityLabel:'swing'},
      ],
    );
    expect(delta.inputAnchorCount).toBe(2);
    expect(delta.returnedSignalCount).toBe(3);
    expect(delta.selectedSignalCount).toBe(3);
    expect(delta.activitiesInfluencedCount).toBe(4);
    expect(delta.selectedSignalsNotNamedInInputs).toEqual(['Jazz','swing']);
  });

  it('does not count substrings of a literal input as new discoveries', () => {
    const delta = buildQlooDelta(
      { ...context, anchors:[{query:'Classic Jazz'}, context.anchors[1]] },
      [{label:'Jazz'}],
      ['Jazz'],
      [{affinityLabel:'Jazz'}],
    );
    expect(delta.selectedSignalsNotNamedInInputs).toEqual([]);
  });
});
