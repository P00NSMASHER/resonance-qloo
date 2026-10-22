import { describe, it, expect } from 'vitest';
import { safePlan } from './safePlan';
const scenarios = [
  [
    "The Hobbit",
    "Kyoto",
    "book",
    "destination",
    "Fiction",
    "Science Fiction & Fantasy"
  ],
  [
    "Ella Fitzgerald",
    "Roman Holiday",
    "artist",
    "movie",
    "Jazz",
    "Romance"
  ],
  [
    "Miles Davis",
    "Paris",
    "artist",
    "destination",
    "Jazz",
    "swing"
  ],
  [
    "Jane Austen",
    "New York",
    "book",
    "destination",
    "Romance",
    "Classics"
  ],
  [
    "Dune",
    "Tokyo",
    "book",
    "destination",
    "Science Fiction & Fantasy",
    "High Fantasy"
  ],
  [
    "The Beatles",
    "London",
    "artist",
    "destination",
    "pop",
    "rock"
  ],
  [
    "Casablanca",
    "Kyoto",
    "movie",
    "destination",
    "Drama",
    "Comedy"
  ],
  [
    "The Sound of Music",
    "Florence",
    "movie",
    "destination",
    "Musical",
    "Jazz"
  ],
  [
    "The Great Gatsby",
    "Rome",
    "book",
    "destination",
    "Fiction",
    "Mystery"
  ],
  [
    "Frida Kahlo",
    "Paris",
    "artist",
    "destination",
    "Jazz",
    "Blues"
  ],
  [
    "Game of Thrones",
    "Berlin",
    "tv_show",
    "destination",
    "Fantasy",
    "War"
  ],
  [
    "The Odyssey",
    "Athens",
    "book",
    "place",
    "Classics",
    "Poetry"
  ],
  [
    "Louis Armstrong",
    "New Orleans",
    "artist",
    "place",
    "Jazz",
    "oldies"
  ],
  [
    "Harry Potter",
    "Osaka",
    "book",
    "destination",
    "Fantasy",
    "Science Fiction"
  ],
  [
    "Beyonce",
    "Toronto",
    "artist",
    "place",
    "pop",
    "soul"
  ],
  [
    "The Godfather",
    "San Francisco",
    "movie",
    "destination",
    "Drama",
    "Crime"
  ],
  [
    "Pride and Prejudice",
    "Vienna",
    "book",
    "place",
    "Romance",
    "Fiction"
  ],
  [
    "The Supremes",
    "Napa Valley",
    "artist",
    "destination",
    "soul",
    "Jazz"
  ],
  [
    "Amelie",
    "Lisbon",
    "movie",
    "destination",
    "Romance",
    "Comedy"
  ],
  [
    "To Kill a Mockingbird",
    "Dublin",
    "book",
    "destination",
    "Classics",
    "Literature"
  ]
] as [string,string,string,string,string,string][];
describe("judge red-team: 20 diverse cultural pairs (synthetic regression fixtures)",()=>{
  it("keeps unrelated session-wide themes out of destination activities",()=>{
    for(const [a,b,atype,btype,first,second] of scenarios){
      const old=[
        {title:"Opening",duration:"5 min",action:"Old cue. Facilitator cue: offer two choices and allow anyone to pass.",why:"",anchorName:a,affinityLabel:first},
        {title:"Bridge",duration:"10 min",action:"Bridge from "+b+" into "+second+". Facilitator cue: offer two choices and allow anyone to pass.",why:"",anchorName:b,affinityLabel:second},
        {title:"Theme",duration:"10 min",action:"Old cue. Facilitator cue: offer two choices and allow anyone to pass.",why:"",affinityLabel:first},
        {title:"Close",duration:"5 min",action:"Old cue. Facilitator cue: offer two choices and allow anyone to pass.",why:"",affinityLabel:second},
      ];
      const types=["urn:entity:"+atype,"urn:entity:"+btype];
      const plan=safePlan(old,[a,b],types,"calm","small-group");
      expect(plan).toHaveLength(4);
      expect(plan[0].action).toContain(a);
      expect(plan[1].action).toContain(b);
      expect(plan.every(item=>item.action.includes("allow anyone to pass"))).toBe(true);
      expect(plan.every(item=>!item.action.includes("Bridge from "+b+" into "+second))).toBe(true);
      expect(plan.every(item=>item.why.includes("session") || item.why.includes("favorite"))).toBe(true);
      if(plan[1].affinityLabel==="") {
        expect(plan[1].action).not.toContain(second);
        expect(plan[1].why).toContain("NOT assigned");
      }
    }
  });
  it("does not attach Hobbit fantasy evidence to Kyoto without support",()=>{
    const src=[
      {title:"Opening",duration:"5 min",action:"Facilitator cue: offer two choices and allow anyone to pass.",why:"",affinityLabel:"Fiction"},
      {title:"Bridge",duration:"10 min",action:"Bridge from Kyoto into Science Fiction & Fantasy. Facilitator cue: offer two choices and allow anyone to pass.",why:"",affinityLabel:"Science Fiction & Fantasy"},
    ];
    const plan=safePlan(src,["The Hobbit","Kyoto"],["urn:entity:book","urn:entity:destination"]);
    expect(plan[1].affinityLabel).toBe("");
    expect(plan[1].action).not.toContain("Science Fiction & Fantasy");
    expect(plan[1].action).toContain("Kyoto");
  });
  it("does not present decorative source labels as calibrated confidence or personal facts",()=>{
    const old=[{title:"Theme",duration:"10 min",action:"Facilitator cue: offer two choices and allow anyone to pass.",why:"",affinityLabel:"+young Adult"}];
    const plan=safePlan(old,[],[]);
    expect(plan[0].action).not.toContain("+young Adult");
    expect(plan[0].why).toContain("not per-favorite attribution");
  });
});

