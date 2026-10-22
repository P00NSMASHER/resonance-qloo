import {describe,it,expect} from 'vitest';
import {
  DEFAULT_STUDIO_MODE, STUDIO_VERSION, composeStudioSteps,
  createStudioPacket, safeImportStudioPacket, chooseDurationIndexes,
  distributeMinutes, studioPacketToText, cleanPublicText, applyDeclinedTopics, looksLikeContactInfo,
} from "./studioLogic";
const plan=[
  {title:"Familiar opening",duration:"5 min",action:"Start with Ella Fitzgerald and invite a low-pressure choice.",why:"Session-level music genre.",affinityLabel:"Jazz",anchorName:"Ella Fitzgerald"},
  {title:"Memory bridge",duration:"10 min",action:"Bridge without forced memory.",why:"Source signal was not assigned to place.",affinityLabel:"",anchorName:"Kyoto"},
  {title:"Conversation choice",duration:"10 min",action:"Offer two alternatives.",why:"Aggregate Qloo theme.",affinityLabel:"Classics"},
  {title:"Recall & close",duration:"5 min",action:"Close with choice.",why:"Aggregate Qloo theme.",affinityLabel:"Literature"},
];
describe("Facilitator Studio — synthetic acceptance checks, never human research",()=>{
  it("makes honest 5/10/15 micro-sessions with exact totals",()=>{
    for(const length of [5,10,15,30,45,60] as const){
      const mode={...DEFAULT_STUDIO_MODE,duration:length};
      const result=composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]);
      expect(result).toHaveLength(length===5?1:length<=15?2:4);
      expect(result.reduce((a,s)=>a+s.durationMinutes,0)).toBe(length);
      expect(result.every(s=>s.permission.includes("Stop or change topic"))).toBe(true);
      expect(result.every(s=>s.sourceWhy.length>0)).toBe(true);
    }
  });
  it("never claims per-favorite Qloo inference after role adaptation",()=>{
    const steps=composeStudioSteps(plan,DEFAULT_STUDIO_MODE,["Ella Fitzgerald","Kyoto"]);
    expect(steps[1].sourceTheme).toContain("No Qloo theme assigned");
    expect(steps[0].sourceTheme).toContain("Aggregate Qloo session theme");
    expect(steps[0].sourceTheme).toContain("not verified for this favorite");
  });
  it("supports audio-off, seated, AAC and zero-props without medical advice",()=>{
    const mode={...DEFAULT_STUDIO_MODE,audioOff:true,textFirst:true,aac:true,seated:true,noEquipment:true,noFood:true};
    const steps=composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]);
    for(const step of steps){
      expect(step.alternative).toContain("AAC");
      expect(step.safeMaterials).toContain("No equipment");
      expect(step.permission).toContain("Fully seated");
      expect(step.permission).toContain("Use no food");
      expect(step.permission).not.toContain("dose");
    }
  });
  it("supports Spanish draft cues without translating evidence source labels",()=>{
    const mode={...DEFAULT_STUDIO_MODE,language:"es" as const,duration:15 as const};
    const steps=composeStudioSteps(plan,mode,["Mercedes Sosa","Buenos Aires"]);
    expect(steps[0].prompt).toContain("¿Prefiere");
    expect(steps[0].sourceTheme).toContain("Jazz");
    expect(steps.every(s=>s.permission.includes("cambiar de tema"))).toBe(true);
  });
  it("creates two opt-in participation tracks without identity assumptions",()=>{
    const steps=composeStudioSteps(plan,{...DEFAULT_STUDIO_MODE,mixedGroup:true},["Ella Fitzgerald","Kyoto"]);
    expect(steps[0].trackA).toContain("Track A");
    expect(steps[0].trackB).toContain("Track B");
    expect(steps.every(s=>s.trackB.includes("do not presume shared tastes"))).toBe(true);
  });
  it("produces versioned cross-device handoffs that can be safely re-opened",()=>{
    const mode={...DEFAULT_STUDIO_MODE,duration:10 as const};
    const steps=composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]);
    const packet=createStudioPacket({steps,anchors:["Ella Fitzgerald","Kyoto"],mode,source:"qloo-live",decisions:["kept","modified"],note:"Quiet room",now:"2026-10-22T12:00:00.000Z"});
    expect(packet.version).toBe(STUDIO_VERSION);
    expect(packet.schema).toBe("resonance-facilitator-handoff-v1");
    expect(safeImportStudioPacket(JSON.parse(JSON.stringify(packet)))).not.toBe(null);
    expect(studioPacketToText(packet)).toContain("non-clinical");
    expect(studioPacketToText(packet)).toContain("not personal predictions");
    expect(studioPacketToText(packet)).toContain("Quiet room");
    const changed={...packet,steps:[{...packet.steps[0],durationMinutes:17},...packet.steps.slice(1)]};
    expect(safeImportStudioPacket(changed)).toBe(null);
  });
  it("rejects malformed payloads and strips markup/control codes",()=>{
    expect(safeImportStudioPacket({schema:"other"})).toBe(null);
    expect(safeImportStudioPacket(null)).toBe(null);
    expect(cleanPublicText("<alert>Person\nline")).toBe("alertPerson line");
    expect(chooseDurationIndexes(15)).toEqual([0,1]);
    expect(distributeMinutes(10,2)).toEqual([5,5]);
  });
  it("regression coverage: 20 constructed contexts, no forced reminiscence",()=>{
    const pairs=[
      ["Fairuz","Beirut"],["Mercedes Sosa","Buenos Aires"],["Umm Kulthum","Cairo"],
      ["Teresa Teng","Taipei"],["Cesária Évora","Lisbon"],["Fela Kuti","Lagos"],
      ["Youssou N'Dour","Dakar"],["The Hobbit","Kyoto"],["Aretha Franklin","The Sound of Music"],
      ["Ludwig van Beethoven","Vienna"],["Frida Kahlo","Mexico City"],["Hayao Miyazaki","Spirited Away"],
      ["Bob Marley","Kingston"],["Fleetwood Mac","Vancouver"],["Nina Simone","Little Women"],
      ["Gilberto Gil","Salvador"],["Agatha Christie","London"],["Toni Morrison","New York City"],
      ["Gabriel García Márquez","Cartagena"],["Shakira","Bogotá"],
    ];
    expect(pairs).toHaveLength(20);
    for(const pair of pairs){
      const steps=composeStudioSteps(plan,{...DEFAULT_STUDIO_MODE,duration:15},pair);
      expect(steps).toHaveLength(2);
      expect(steps.every(s=>s.permission.includes("Stop or change topic"))).toBe(true);
      expect(steps.every(s=>!s.prompt.includes("Do you remember when"))).toBe(true);
    }
  });
  it("separates original Qloo action from a facilitator-authored edit in exported handoffs",()=>{
    const mode={...DEFAULT_STUDIO_MODE,duration:10 as const};
    const steps=composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]);
    const packet=createStudioPacket({steps,anchors:["Ella Fitzgerald","Kyoto"],mode,source:"qloo-live",
      decisions:["kept","modified"],edits:{1:"Facilitator changed this into a silent-picture choice."},note:"",now:"2026-10-22T12:00:00Z"});
    expect(packet.steps[1].sourceAction).toContain("Bridge without forced memory");
    expect(packet.facilitatorEdits?.[0].decision).toBe("modified");
    expect(studioPacketToText(packet)).toContain("Facilitator-authored revision");
    expect(safeImportStudioPacket(JSON.parse(JSON.stringify(packet)))).not.toBe(null);
  });
  it("fails closed on forged source, invalid flags, modified durations and oversized imported content",()=>{
    const mode={...DEFAULT_STUDIO_MODE,duration:10 as const};
    const base=createStudioPacket({steps:composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]),
      anchors:["Ella Fitzgerald","Kyoto"],mode,source:"illustrative-demo"});
    expect(safeImportStudioPacket({...base,source:"verified clinical"})).toBe(null);
    expect(safeImportStudioPacket({...base,mode:{...base.mode,aac:"yes"}})).toBe(null);
    expect(safeImportStudioPacket({...base,anchors:["X".repeat(101)]})).toBe(null);
    expect(safeImportStudioPacket({...base,steps:[{...base.steps[0],sourceWhy:"X".repeat(4500)}]})).toBe(null);
    expect(safeImportStudioPacket({...base,sessionMinutes:15})).toBe(null);
    expect(safeImportStudioPacket({...base,facilitatorEdits:[{index:10,decision:"modified",text:"x"}]})).toBe(null);
  });
  it("does not label a preview adaptation as verified live Qloo evidence",()=>{
    const steps=composeStudioSteps(plan,DEFAULT_STUDIO_MODE,["Ella Fitzgerald","Kyoto"],"illustrative-demo");
    expect(steps[0].sourceTheme).toContain("Illustrative demo");
    expect(steps[0].sourceTheme).not.toContain("Aggregate Qloo session theme");
  });

  it("exports declined topics as neutral alternatives without erasing source audit",()=>{
    const mode={...DEFAULT_STUDIO_MODE,duration:10 as const};
    const base=composeStudioSteps(plan,mode,["Ella Fitzgerald","Kyoto"]);
    const changed=applyDeclinedTopics(base,[1]);
    expect(base[1].sourceTheme).toContain("No Qloo theme assigned");
    expect(changed[1].prompt).toContain("different neutral subject");
    expect(changed[1].sourceAction).toBe(base[1].sourceAction);
    expect(changed[1].sourceTheme).toContain("Declined during this session");
    const packet=createStudioPacket({steps:changed,anchors:["Ella Fitzgerald","Kyoto"],mode,source:"qloo-live"});
    expect(studioPacketToText(packet)).toContain("Topic declined");
    expect(safeImportStudioPacket(JSON.parse(JSON.stringify(packet)))).not.toBe(null);
    expect(applyDeclinedTopics(base,[])).toEqual(base);
  });
  it("detects obvious contact details in exported notes without claiming full PII detection",()=>{
    expect(looksLikeContactInfo("Private email test@example.com")).toBe(true);
    expect(looksLikeContactInfo("Call 570-555-0102")).toBe(true);
    expect(looksLikeContactInfo("Quiet room; seated; no equipment")).toBe(false);
  });

});

