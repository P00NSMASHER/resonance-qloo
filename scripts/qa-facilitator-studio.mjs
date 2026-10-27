// Synthetic, isolated browser acceptance for published Facilitator Studio.
// Never sends study responses, stores private person data, or claims real-user validation.
// Uses clearly labeled illustrative preview; does not spend Qloo recommendation quota.
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
const root=process.env.RESONANCE_BASE_URL||"https://resonance-qloo.floot.app";
const out=process.env.STUDIO_QA_OUT||"judge-gallery";
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox"]});
let checks=0;
const ok=(value,description)=>{if(!value)throw new Error("FAIL "+description);checks++;console.log("PASS "+description);};
try {
 const page=await browser.newPage({viewport:{width:1440,height:980},acceptDownloads:true,deviceScaleFactor:1});
 await page.goto(root,{waitUntil:"networkidle",timeout:60000});
 await page.getByText("Live Qloo verified").waitFor({state:"visible",timeout:30000});
 const choice=page.getByLabel("Is this favorite still welcome today?").first();
 await choice.selectOption("declined");
 await page.getByText("A favorite is marked declined").waitFor({state:"visible"});
 ok(await page.getByRole("button",{name:/Build with live Qloo/}).isDisabled(),"declined favorite blocks new live query");
 await choice.selectOption("uncertain");
 await page.getByRole("button",{name:"Preview with example data"}).click();
 await page.getByText("Illustrative session preview").waitFor({state:"visible",timeout:10000});
 ok(await page.getByText("ILLUSTRATIVE DEMO").count()>0,"not-live preview remains explicitly labeled");
 const studio=page.locator('section[aria-label="Facilitator Studio"]');
 await studio.getByRole("button",{name:"Open facilitator adaptations"}).click();
 const duration=studio.getByLabel("Adapted length");
 for(const [value,num] of [["5",5],["10",10],["15",15]]){
   await duration.selectOption(value);
   const count=await studio.locator('section[aria-label="Adapted activities"] article').count();
   const expected=value==="5"?1:2;
   ok(count===expected,"micro-session "+num+" minutes has "+expected+" steps");
   ok((await studio.getByText(new RegExp("· "+num+" minutes planned")).count())>0,"micro-session "+num+" minutes shows honest total");
 }
 const consent=studio.getByRole("checkbox",{name:/I will ask before starting/});
 ok(await studio.getByRole("button",{name:"Start / resume"}).isDisabled(),"pacing timer initially gated on facilitator consent");
 await consent.check();
 await studio.getByRole("button",{name:"Start / resume"}).click();
 await page.waitForTimeout(1150);
 await studio.getByRole("button",{name:"Pause"}).click();
 ok(await studio.getByText(/00:0[1-9]/).count()>0,"pacing timer counts and pauses");
 await studio.getByLabel("AAC / pointing / eye gaze").check();
 await studio.getByLabel("Audio off / captions or text").check();
 await studio.getByLabel("High contrast").check();
 await studio.getByLabel("Two opt-in group tracks").check();
 ok((await studio.getByText(/AAC, observing, and passing/).count())>0,"AAC-friendly choice cue rendered");
 ok((await studio.getByText(/Track B · separate opt-in/).count())>0,"second opt-in group track is visible");
 await studio.getByLabel("Facilitator cue language").selectOption("es");
 ok((await studio.getByText("¿Prefiere", {exact:false}).count())>0,"Spanish draft prompts visible");
 await studio.getByLabel("Facilitator cue language").selectOption("en");
 await studio.getByRole("button",{name:"Pass / switch topic"}).first().click();
 ok((await studio.getByText("Topic declined. Offer a pause", {exact:false}).count())>0,"immediate topic switch displayed");
 const groupTrack=studio.locator('section[aria-label="Adapted activities"] article').first().locator('[class*="tracks"]');
 const groupText=await groupTrack.innerText();
 ok(!groupText.includes("Aretha Franklin") && groupText.includes("Optional pause"),
   "declined topic is absent from every visible opt-in group track");
 const jsonEvent=page.waitForEvent("download",{timeout:15000});
 await studio.getByRole("button",{name:"Download versioned JSON"}).click();
 const download=await jsonEvent;const file=await download.path();ok(Boolean(file)&&!(await download.failure()),"versioned JSON downloaded");
 const packet=JSON.parse(await readFile(file,"utf8"));
 ok(packet.schema==="resonance-facilitator-handoff-v1"&&packet.source==="illustrative-demo","handoff source is illustrative and versioned");
 ok(packet.sessionMinutes===15 && packet.steps.reduce((sum,x)=>sum+x.durationMinutes,0)===15,"handoff timings remain exact");
 ok(packet.steps[0].sourceTheme.includes("Declined during this session"),"declined topic remains declined in exported handoff");
 const input=studio.getByLabel("Open a previously exported handoff on another device");
 await input.setInputFiles(file);
 await studio.getByText(/Imported unverified 15-minute packet/).waitFor({state:"visible",timeout:5000});
 ok(true,"import is explicitly unverified even when source is declared");
 const htmlEvent=page.waitForEvent("download",{timeout:15000});
 await studio.getByRole("button",{name:"Download complete offline plan"}).click();
 const htmlDownload=await htmlEvent,html=await readFile(await htmlDownload.path(),"utf8");
 ok(html.includes("<!DOCTYPE html>") && html.includes("Self-contained") && !html.includes('<script src='),"self-contained offline HTML plan downloaded");
 const cardEvent=page.waitForEvent("download",{timeout:15000});
 await studio.getByRole("button",{name:/One-page run sheet/}).click();
 const card=await cardEvent,cardHtml=await readFile(await card.path(),"utf8");
 ok(cardHtml.includes("one-page run sheet")&&cardHtml.includes("Print / save as PDF"),"print-to-PDF-ready one-page run sheet downloaded");
 await studio.screenshot({path:out+"/05-facilitator-studio-desktop.png"});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await mobile.goto(root,{waitUntil:"networkidle",timeout:60000});
 await mobile.getByRole("button",{name:"Preview with example data"}).click();
 const mstudio=mobile.locator('section[aria-label="Facilitator Studio"]');
 await mstudio.getByRole("button",{name:"Open facilitator adaptations"}).click();
 await mstudio.getByLabel("Adapted length").selectOption("5");
 const size=await mobile.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 ok(size.body<=size.viewport+2,"mobile Studio has no horizontal document overflow");
 await mstudio.screenshot({path:out+"/05-facilitator-studio-iphone.png"});
 console.log("Studio synthetic browser acceptance passed: "+checks+" checks");
} finally {await browser.close();}
