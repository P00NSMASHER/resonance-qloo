const url='https://devpost.com/software/resonance-nud9ek';
const normalize=text=>String(text).replace(/&(?:nbsp|amp|quot|lt|gt);/g,match=>({
  '&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>',
}[match]??match)).replace(/&#(?:x([a-f0-9]+)|([0-9]+));/gi,(_,hex,dec)=>{
  try {return String.fromCodePoint(parseInt(hex||dec,hex?16:10));}
  catch {return ' ';}
}).replace(/\s+/g,' ').toLowerCase();
const readStory=html=>normalize(html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
);
const assess=html=>{
  const raw=readStory(html);
  const signals={
    currentBrand:raw.includes('culture becomes connection'),
    filteredGenreEvidence:raw.includes('music and media genre')||raw.includes('music/media genre')||raw.includes('music and film genre'),
    fourTimedActivities:raw.includes('four timed')||raw.includes('four activities'),
    facilitatorControl:raw.includes('keep, modify or replace')||raw.includes('keep / modify / replace'),
    honestSyntheticResult:raw.includes('4/5')&&raw.includes('synthetic'),
    noHumanImpactClaim:raw.includes('zero real-user')||raw.includes('zero independently reviewed')||raw.includes('zero validated')||raw.includes('zero real participants'),
    correctDemo:raw.includes('https://resonance-qloo.floot.app'),
    correctRepo:raw.includes('github.com/p00nsmasher/resonance-qloo'),
  };
  const stale={
    oldUnfilteredSignals:raw.includes('jazz, reporter, inventive, swing'),
    oldSnapshotCount:raw.includes('28-file floot snapshot')||raw.includes('exact 28-file'),
  };
  const updated=Object.values(signals).every(Boolean) &&
    !stale.oldUnfilteredSignals && !stale.oldSnapshotCount;
  return {updated,signals,stale};
};

if(process.argv.includes('--selftest')) {
  const empty=assess('<html><body><h1>Resonance</h1>Old unfiltered Jazz, Reporter, Inventive, swing; exact 28-file Floot snapshot</body></html>');
  if(empty.updated || !empty.stale.oldUnfilteredSignals || !empty.stale.oldSnapshotCount) throw new Error('Devpost historical story was not detected');
  const fresh=assess('<html><body>Culture becomes connection. Music and media genre evidence. Four timed activities. Keep, Modify or Replace. Synthetic evaluation 4/5. Zero real-user responses. https://resonance-qloo.floot.app https://github.com/P00NSMASHER/resonance-qloo</body></html>');
  if(!fresh.updated) throw new Error('Current valid story was not recognized');
  console.log('Devpost public-story audit self-test passed (synthetic HTML only).');
} else {
  let response;
  try{
    response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; ResonancePublicSubmissionAudit/1.0)'},signal:AbortSignal.timeout(20000)});
  }catch{
    console.error('DEVPOST_CHECK_UNAVAILABLE: Public page could not be fetched; no account state inferred.');
    process.exit(2);
  }
  if(!response.ok){
    console.error('DEVPOST_CHECK_UNAVAILABLE: Public page returned HTTP '+response.status+'; no account state inferred.');
    process.exit(2);
  }
  const html=await response.text();
  const result=assess(html);
  console.log(JSON.stringify({
    publicUrl:url,
    publicHttpStatus:response.status,
    publicStoryCurrent:result.updated,
    visibleStorySignals:result.signals,
    stalePublicStoryMarkers:result.stale,
    authenticatedSubmissionStatus:'NOT_CHECKED',
    devpostStorySavedByThisScript:false,
    instructions:result.updated
      ? 'Public narrative appears current. Confirm authenticated Submitted state and gallery separately.'
      : 'Public narrative is out of date. Use the existing entry editor and docs/DEVPOST_EDIT_PACKET.md; do not create a second submission.',
  },null,2));
  if(!result.updated) process.exitCode=2;
}
