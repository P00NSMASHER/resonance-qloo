export const ANCHOR_TYPES = {
  any: null,
  artist: 'urn:entity:artist',
  movie: 'urn:entity:movie',
  book: 'urn:entity:book',
  brand: 'urn:entity:brand',
  destination: 'urn:entity:destination',
  place: 'urn:entity:place',
  podcast: 'urn:entity:podcast',
  tv_show: 'urn:entity:tv_show',
  videogame: 'urn:entity:videogame',
} as const;

export type AnchorType = keyof typeof ANCHOR_TYPES;

export const ANCHOR_TYPE_OPTIONS: Array<{value:AnchorType;label:string}> = [
  {value:'any',label:'Any category'},
  {value:'artist',label:'Artist'},
  {value:'movie',label:'Film'},
  {value:'book',label:'Book'},
  {value:'brand',label:'Brand'},
  {value:'destination',label:'Destination'},
  {value:'place',label:'Place / restaurant'},
  {value:'podcast',label:'Podcast'},
  {value:'tv_show',label:'TV show'},
  {value:'videogame',label:'Video game'},
];

export function isAnchorType(value: unknown): value is AnchorType {
  return typeof value === 'string' && value in ANCHOR_TYPES;
}

export function anchorTypeUrn(value: AnchorType | undefined) {
  if (!value || value === 'any') return undefined;
  return ANCHOR_TYPES[value] ?? undefined;
}


export function anchorTypeLabelFromUrn(urn: string | undefined) {
  if (!urn) return undefined;
  const entry = ANCHOR_TYPE_OPTIONS.find(option => anchorTypeUrn(option.value) === urn);
  return entry?.label;
}
