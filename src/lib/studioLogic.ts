// Resonance Facilitator Studio: deterministic, privacy-conscious UX adaptation.
// Qloo supplies AGGREGATE session signals; never infer individual resident attributes.
// These functions contain no network calls and do not overwrite Qloo provenance.
export type StudioLanguage = "en"|"es";
export type PreferenceStatus = "current"|"uncertain"|"declined";
export type StudioDuration = 5|10|15|30|45|60;
export type StudioMode = {
  language:StudioLanguage;
  duration:StudioDuration;
  audioOff:boolean;
  textFirst:boolean;
  highContrast:boolean;
  aac:boolean;
  seated:boolean;
  noEquipment:boolean;
  noFood:boolean;
  lowStim:boolean;
  mixedGroup:boolean;
};
export type StudioSourceStep = {
  title:string;duration:string;action:string;why:string;
  affinityLabel?:string;anchorName?:string;
};
export type StudioStep = {
  index:number;title:string;durationMinutes:number;intro:string;
  prompt:string;alternative:string;permission:string;safeMaterials:string;
  sourceAction:string;sourceWhy:string;sourceTheme:string;trackA:string;trackB:string;
};
export const STUDIO_VERSION="2026-10-22.facilitator-v1";
export const DEFAULT_STUDIO_MODE:StudioMode={
  language:"en",duration:30,audioOff:false,textFirst:false,highContrast:false,
  aac:false,seated:true,noEquipment:true,noFood:true,lowStim:true,mixedGroup:false,
};
export function cleanPublicText(s:string):string {
  return s.normalize("NFKC").replace(/[<>]/g,"").replace(/[\u0000-\u001F\u007F]/g," ").replace(/\s+/g," ").trim().slice(0,280);
}
export function chooseDurationIndexes(duration:StudioDuration):number[]{
  if(duration===5)return [0];
  if(duration===10)return [0,1];
  if(duration===15)return [0,1];
  return [0,1,2,3];
}
export function distributeMinutes(duration:StudioDuration,parts:number):number[]{
  if(parts<=0)return [];
  const base=Math.floor(duration/parts),rem=duration%parts;
  return Array.from({length:parts},(_,i)=>base+(i<rem?1:0));
}
export function composeStudioSteps(plan:StudioSourceStep[],mode:StudioMode,anchors:string[],source:"qloo-live"|"illustrative-demo"="qloo-live"):StudioStep[]{
  const selected=chooseDurationIndexes(mode.duration).filter(i=>i<plan.length);
  const sourceTimes=selected.map(i=>Number.parseInt(plan[i]?.duration||"0",10));
  const sourceTotal=sourceTimes.reduce((a,b)=>a+b,0);
  const times=sourceTotal===mode.duration && sourceTimes.every(x=>x>0)
    ? sourceTimes : distributeMinutes(mode.duration,selected.length);
  return selected.map((originalIndex,k)=>{
    const item=plan[originalIndex];
    const theme=cleanPublicText(item.affinityLabel||"");
    const anchor=cleanPublicText(item.anchorName||anchors[originalIndex%Math.max(anchors.length,1)]||"");
    const subject=anchor||theme|| (mode.language==="es"?"un tema conocido":"a familiar topic");
    const low=mode.lowStim||mode.audioOff||mode.textFirst;
    const speak=mode.language==="es";
    const intro=speak
      ? `Ofrezca una elección sobre “${subject}”. Escuchar, observar o no participar está bien.`
      : `Offer an invitation about “${subject}”. Listening, observing, or passing are all welcome.`;
    const prompt=speak
      ? "¿Prefiere hablar de un detalle, elegir entre dos opciones o cambiar de tema?"
      : "Would you prefer one detail, a choice between two options, or a different topic?";
    const alternative=mode.aac
      ? (speak?"Puede señalar, mirar una opción, usar comunicación aumentativa o pasar.":"Pointing, eye gaze, AAC, observing, and passing are equal choices.")
      : mode.textFirst
        ? (speak?"Ofrezca texto grande y dos opciones sencillas; describa el texto en voz alta si se desea.":"Offer large readable text and two simple choices; describe aloud if requested.")
        : (speak?"Ofrezca una imagen descrita en palabras o dos temas orales.":"Offer a verbal description or two topic choices; no personal memory is required.");
    const safeMaterials=mode.noEquipment
      ? (speak?"Sin materiales: voz, pausa y dos opciones; imágenes y música son opcionales.":"No equipment: words, a pause, and two choices; pictures and music are optional.")
      : (mode.audioOff||low
        ? (speak?"Opcional: tarjetas de texto grandes; sin audio.":"Optional large-text cards; no sound required.")
        : (speak?"Solo medios con permiso de uso o descripciones propias.":"Only use licensed/permissioned media, or your own verbal descriptions."));
    const noMovement=mode.seated
      ? (speak?"Toda actividad funciona sentado, sin levantarse ni alcanzar objetos.":"Fully seated; no standing, reaching, or movement is assumed.")
      : (speak?"El movimiento es opcional, nunca obligatorio.":"Movement is optional, never required.");
    const otherAnchor=anchors.length>1
      ? cleanPublicText(anchors[(originalIndex+1)%anchors.length]||"")
      : "";
    const noFood=mode.noFood
      ? (speak?"No use alimentos ni sugiera requisitos de deglución.":"Use no food, drinks, or swallowing recommendations.")
      : (speak?"Confirme las políticas locales antes de usar objetos o comida.":"Check facility policy before providing objects or any food.");
    const permission=speak
      ? `Pregunte antes de empezar y en cada paso. Se puede parar o cambiar de tema en cualquier momento. ${noMovement} ${noFood}`
      : `Ask before starting and at each step. Stop or change topic immediately if requested. ${noMovement} ${noFood}`;
    const sourceTheme=theme
      ? source==="illustrative-demo" ? `Illustrative demo theme: ${theme}; not live Qloo evidence.` : `Aggregate Qloo session theme: ${theme}; not verified for this favorite or person.`
      : "No Qloo theme assigned to this step; start from an explicitly supplied favorite.";
    return {
      index:originalIndex,title:cleanPublicText(item.title)||"Choice-based activity",
      durationMinutes:times[k],intro,prompt,alternative,permission,safeMaterials,
      sourceAction:item.action,sourceWhy:item.why,sourceTheme,
      trackA:speak
        ? `Pista A (participación): invite una elección con “${subject}”; cambie el tema si no interesa.`
        : `Track A · optional participation: invite a choice about “${subject}”; change topic if unwanted.`,
      trackB:speak
        ? `Pista B (otra elección): ${otherAnchor?"opción sobre “"+otherAnchor+"” o ":""}observar, escuchar una descripción o pasar; sin suponer gustos compartidos.`
        : `Track B · separate opt-in starting favorite: ${otherAnchor||"a different topic"}. Observe, hear a description or pass; do not presume shared tastes.`,
    };
  });
}
export type StudioPacket={
  schema:"resonance-facilitator-handoff-v1";
  version:string;generatedAt:string;source:"qloo-live"|"illustrative-demo";
  anchors:string[];sessionMinutes:StudioDuration;mode:StudioMode;steps:StudioStep[];
  decisions:string[];facilitatorEdits?:{index:number;decision:string;text:string}[];note:string;rightsNotice:string;safetyNotice:string;validityNotice:string;
};
export function createStudioPacket(args:{
  steps:StudioStep[];anchors:string[];mode:StudioMode;source:"qloo-live"|"illustrative-demo";
  decisions?:string[];edits?:Record<number,string>;note?:string;now?:string;
}):StudioPacket{
  return {
    schema:"resonance-facilitator-handoff-v1",version:STUDIO_VERSION,
    generatedAt:args.now||new Date().toISOString(),source:args.source,
    anchors:args.anchors.map(cleanPublicText).slice(0,4),
    sessionMinutes:args.mode.duration,mode:args.mode,steps:args.steps,
    decisions:(args.decisions||[]).slice(0,4),
    facilitatorEdits:Object.entries(args.edits||{}).filter(([key,text])=>Number.isInteger(Number(key))&&Number(key)>=0&&Number(key)<4&&typeof text==="string"&&text.trim()).map(([key,text])=>({index:Number(key),decision:args.decisions?.[Number(key)]||"facilitator edit",text:cleanPublicText(text)})),
    note:cleanPublicText(args.note||"").slice(0,280),
    rightsNotice:"Do not assume a right to stream, copy, or share media. Use lawful materials or no-media alternatives.",
    safetyNotice:"This is non-clinical cultural-engagement guidance. Follow facility policy; do not enter health information, and check relevant accessibility, mobility and dietary restrictions outside this tool.",
    validityNotice:"This packet is a facilitator adaptation. Qloo signals are aggregate, not personal predictions. Spanish cues are editorial drafts and require native-speaker review. No validated improvement over baseline has been established.",
  };
}
export function studioPacketToText(p:StudioPacket):string{
  const lines=[
    "RESONANCE — FACILITATOR HANDOFF (v1)",
    "Version: "+p.version,
    "Created: "+p.generatedAt,"Evidence source: "+p.source,
    "Session: "+p.sessionMinutes+" minutes",
    "Supplied favorites: "+p.anchors.join(" | "),
    "Mode: "+JSON.stringify(p.mode),
    "Decisions: "+p.decisions.join(" | "),
    p.rightsNotice,p.safetyNotice,p.validityNotice,
    "Consent: ask first, allow immediate opt-out and topic switch.",
    "No resident identifiers or health information should be included.",
    "Imported handoffs are self-declared files, not authenticated Qloo verification receipts.",
    "",
    ...p.steps.flatMap((s,i)=>[
      `${i+1}. ${s.title} (${s.durationMinutes} min)`,
      s.intro,s.prompt,s.alternative,s.permission,s.safeMaterials,
      "Group choice A: "+s.trackA,"Group choice B: "+s.trackB,
      "Attribution: "+s.sourceTheme,
      "Facilitator reasoning: "+s.sourceWhy,
      ...(p.facilitatorEdits?.filter(x=>x.index===s.index).map(x=>"Facilitator-authored revision ("+x.decision+"): "+x.text)??[]),
      "",
    ]),
    ...(p.note?["Non-identifying handoff note: "+p.note]:[]),
    "End of packet. Recheck current preference and consent before using.",
  ];
  return lines.join("\n");
}
export function safeImportStudioPacket(value:unknown):StudioPacket|null{
  if(!value||typeof value!=="object")return null;
  const o=value as Partial<StudioPacket>;
  if(o.schema!=="resonance-facilitator-handoff-v1"||
    o.version!==STUDIO_VERSION||!Array.isArray(o.steps)||o.steps.length>4||
    !o.steps.length||!Array.isArray(o.anchors)||o.anchors.length>4 ||
    ![5,10,15,30,45,60].includes(Number(o.sessionMinutes)))return null;
  if(o.steps.some((s:any)=>!s||typeof s.prompt!=="string"||s.prompt.length>1500 ||
    typeof s.title!=="string"||s.title.length>300||typeof s.durationMinutes!=="number"))return null;
  if(!o.mode||typeof o.mode!=="object"||!["en","es"].includes(o.mode.language)||o.mode.duration!==o.sessionMinutes)return null;
  const checks=["audioOff","textFirst","highContrast","aac","seated","noEquipment","noFood","lowStim","mixedGroup"] as const;
  if(checks.some(k=>typeof o.mode?.[k]!=="boolean"))return null;
  if(o.source!=="qloo-live"&&o.source!=="illustrative-demo")return null;
  if(!o.anchors.every(x=>typeof x==="string"&&x.length<=100))return null;
  const strings=["intro","alternative","permission","safeMaterials","sourceAction","sourceWhy","sourceTheme","trackA","trackB"] as const;
  if(o.steps.some((step,i)=>!Number.isInteger(step.index)||step.index<0||step.index>3||
      !Number.isInteger(step.durationMinutes)||step.durationMinutes<1||
      strings.some(k=>typeof step[k]!=="string"||step[k].length>4000)))return null;
  if(o.steps.reduce((n,step)=>n+step.durationMinutes,0)!==o.sessionMinutes)return null;
  if(!Array.isArray(o.decisions)||o.decisions.length>4||!o.decisions.every(x=>typeof x==="string"&&x.length<=50))return null;
  if(o.facilitatorEdits!==undefined&&(!Array.isArray(o.facilitatorEdits)||o.facilitatorEdits.length>4||
    o.facilitatorEdits.some(x=>!x||!Number.isInteger(x.index)||x.index<0||x.index>3||
      typeof x.text!=="string"||x.text.length>280||typeof x.decision!=="string"||x.decision.length>60)))return null;
  if(typeof o.note!=="string"||o.note.length>280||
    typeof o.rightsNotice!=="string"||typeof o.safetyNotice!=="string"||
    typeof o.validityNotice!=="string")return null;
  return o as StudioPacket;
}
