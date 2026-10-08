export const studyTiming = {
  finish(startedAt:number|null, endedAt:number, minSeconds:number, maxSeconds:number) {
    if (startedAt===null || !Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
      return {ok:false as const,reason:"Start the timer before recording a result.",reset:false};
    }
    const seconds=Math.floor((endedAt-startedAt)/1000);
    if (seconds < minSeconds) {
      return {ok:false as const,reason:`At least ${minSeconds} seconds are required for this task. Continue working, then finish the timer.`,reset:false};
    }
    if (seconds > maxSeconds) {
      return {ok:false as const,reason:"This attempt exceeded the study time limit. Restart this task if you would like to submit a measurement.",reset:true};
    }
    return {ok:true as const,seconds};
  },
};