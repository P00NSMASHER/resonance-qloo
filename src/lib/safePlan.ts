// Reconcile cultural anchors with aggregate Qloo tags without inventing per-anchor attribution.
// A returned session-wide tag is NEVER proof that any particular favorite or person has that affinity.
type DraftPlanItem = { title:string; duration:string; action:string; why:string; affinityLabel:string; anchorName?:string };
function tidyLabel(raw:string) {
  return raw.normalize("NFKC").replace(/^[^\p{L}\p{N}]+/gu,"").replace(/\s+/g," ").trim().slice(0,90) || "cultural theme";
}
function labelFamily(value:string):"music"|"story"|"place"|"visual"|"food"|"unknown" {
  const label=tidyLabel(value).toLowerCase();
  if (/\b(jazz|swing|blues|music|musical|vocal|piano|rock|soul|funk|folk|dance|soundtrack|oldies|pop)\b/.test(label)) return "music";
  if (/\b(fiction|fantasy|literature|book|novel|story|stories|drama|romance|comedy|classic|film|cinema|biograph|young adult|mystery|science fiction|poetry)\b/.test(label)) return "story";
  if (/\b(travel|destination|place|city|country|geograph|cultural destination|garden|nature)\b/.test(label)) return "place";
  if (/\b(art|painting|visual|design|fashion|color|craft|photo)\b/.test(label)) return "visual";
  if (/\b(food|cuisine|dining|restaurant|culinary|taste)\b/.test(label)) return "food";
  return "unknown";
}
function favoriteFamily(type:string):string {
  if (/artist|podcast/.test(type)) return "music";
  if (/book|movie|tv_show|videogame/.test(type)) return "story";
  if (/destination|place/.test(type)) return "place";
  if (/brand/.test(type)) return "visual";
  return "unknown";
}
function favoriteCue(name:string,urn:string) {
  const family=favoriteFamily(urn);
  if(family==="music") return `offer a properly licensed short excerpt, a photo, or a rhythm description of “${name}”. Ask: “Which sound or image interests you?”`;
  if(family==="story") return `offer a cover, still, or short permitted excerpt from “${name}”. Ask: “Which image or story detail catches your attention?”`;
  if(family==="place") return `offer two accessible photographs or a map of “${name}”. Ask: “Which scene would you like to explore?” Do not assume a past visit.`;
  if(family==="visual") return `offer two high-contrast pictures or objects associated with “${name}”. Ask: “Which detail would you choose?”`;
  return `offer a familiar picture, object, or brief description of “${name}”. Ask: “Would you like to explore this or choose something else?”`;
}
export function safePlan<T extends DraftPlanItem>(
  original:T[], anchors:string[]=[], anchorTypes:string[]=[], energy="calm", setting="small-group",
):T[] {
  return original.map((item,index)=>{
    const name=anchors[index]||"";
    const type=anchorTypes[index]||"";
    const raw=item.affinityLabel;
    const theme=tidyLabel(raw);
    const anchorKind=favoriteFamily(type);
    const tagKind=labelFamily(raw);
    const compatible=!name || anchorKind==="unknown" || (tagKind!=="unknown" && (
      anchorKind===tagKind || (anchorKind==="story" && tagKind==="music") ||
      (anchorKind==="place" && tagKind==="visual")
    ));
    const lead=name ? `Start from the supplied favorite “${name}”: ${favoriteCue(name,type)}`
      : `Offer an optional shared-theme activity inspired by “${theme}”, a Qloo signal for the set of favorites. Invite a simple choice of two pictures, sounds, or topics.`;
    const pace=energy==="active"?"Keep movement optional.":energy==="social"?"Invite easy discussion.":"Keep the pace gentle.";
    const audience=setting==="community"?"Let people step in or out.":"Allow pointing, speech, gestures, or quiet observation.";
    if(name && !compatible) {
      return {...item,affinityLabel:"",action:`${lead} ${pace} ${audience} Facilitator cue: Ask which part to revisit. Invite spoken or nonverbal responses, and allow anyone to pass.`,
        why:`This activity uses the supplied favorite directly. Qloo returned “${theme}” only at session level; no supported genre connection to “${name}” was established, so that signal is retained in the evidence panel but NOT assigned to this activity.`} as T;
    }
    const cueIndex=item.action.lastIndexOf("Facilitator cue:");
    const generatedCue=cueIndex>=0 ? item.action.slice(cueIndex).replaceAll(raw,theme)
      : "Facilitator cue: Offer two accessible choices. Invite spoken or nonverbal responses, and allow anyone to pass.";
    const action=name
      ? `${lead} If appropriate, offer “${theme}” as a SEPARATE optional Qloo session-wide theme, not a verified association with “${name}”. ${pace} ${audience} ${generatedCue}`
      : `${lead} ${pace} ${audience} ${generatedCue}`;
    return {...item,action,why:`The Qloo-grounded memory/conversation neighborhood includes “${theme}” as an aggregate session signal. It is an optional facilitation theme, not per-favorite attribution or a claim about an individual.`} as T;
  });
}
