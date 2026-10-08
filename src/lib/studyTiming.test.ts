import { describe, expect, it } from 'vitest';
import { studyTiming } from './studyTiming';

describe('study timer integrity', () => {
  it('refuses to inflate an invalid elapsed time to the minimum', () => {
    expect(studyTiming.finish(1000,15999,15,3600)).toMatchObject({ok:false,reset:false});
    expect(studyTiming.finish(1000,5999,5,1800)).toMatchObject({ok:false,reset:false});
  });
  it('records exact elapsed whole seconds within allowed bounds', () => {
    expect(studyTiming.finish(1000,16000,15,3600)).toEqual({ok:true,seconds:15});
    expect(studyTiming.finish(1000,901000,15,3600)).toEqual({ok:true,seconds:900});
    expect(studyTiming.finish(1000,3601000,15,3600)).toEqual({ok:true,seconds:3600});
  });
  it('fails closed for overlong, invalid, reversed or absent clocks', () => {
    expect(studyTiming.finish(1000,3602000,15,3600)).toMatchObject({ok:false,reset:true});
    expect(studyTiming.finish(null,20000,15,3600).ok).toBe(false);
    expect(studyTiming.finish(2000,1000,15,3600).ok).toBe(false);
    expect(studyTiming.finish(Number.NaN,5000,15,3600).ok).toBe(false);
  });
});
