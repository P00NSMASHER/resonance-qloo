const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
import { mkdir } from 'node:fs/promises';

const out = process.env.GALLERY_OUT || 'judge-gallery';
const url = process.env.RESONANCE_BASE_URL || 'https://resonance-qloo.floot.app';
await mkdir(out,{recursive:true});

const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args:['--no-sandbox'],
});
const page = await browser.newPage({ viewport:{ width:1440,height:1100 }, deviceScaleFactor:1 });
await page.goto(url,{waitUntil:'networkidle',timeout:60_000});
await page.getByText('Live Qloo verified').waitFor({state:'visible',timeout:30_000});
await page.screenshot({path:`${out}/01-input.png`,fullPage:false});

// Brand QA is recorded independently from the three historical judge-flow
// captures. Check real browser layout and images before claiming acceptance.
const heroLink=page.getByRole('link',{name:/Create a cultural session/i});
await heroLink.waitFor({state:'visible',timeout:15_000});
const verifyBrand=async (target,label) => {
  const result=await target.evaluate(() => ({
    viewport:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    iconLoaded:Array.from(document.querySelectorAll('img')).some(x=>x.src.includes('10b9d53a')&&x.complete&&x.naturalWidth>0),
    artworkLoaded:Array.from(document.querySelectorAll('img')).some(x=>x.src.includes('resonance-hero-optimized.webp')&&x.complete&&x.naturalWidth>0),
    heading:Array.from(document.querySelectorAll('h1')).map(x=>x.textContent?.trim()),
  }));
  if(result.scroll>result.viewport+2) throw new Error(`${label} has horizontal overflow: ${JSON.stringify(result)}`);
  if(!result.iconLoaded||!result.artworkLoaded||!result.heading.some(x=>x.includes('Culture becomes connection.'))) {
    throw new Error(`${label} brand assets/headline missing: ${JSON.stringify(result)}`);
  }
  console.log(`Resonance brand QA ${label}: ${JSON.stringify(result)}`);
};
await verifyBrand(page,'desktop-1440');
await page.screenshot({path:`${out}/00-brand-desktop.png`,fullPage:false});
const newArtworks=page.locator('img[src*="optimized.webp"]');
const artCount=await newArtworks.count();
if(artCount!==6)throw new Error('Expected all six optimized cultural artworks, got '+artCount);
for(const image of await newArtworks.all()){
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(async el=>{
    const img=el;
    await img.decode();
    if(!img.complete||!img.naturalWidth)throw new Error('Optimized image failed to load: '+img.src);
  });
}
console.log('All six optimized cultural artworks load on desktop.');
await page.evaluate(()=>window.scrollTo(0,0));

const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await phone.goto(url,{waitUntil:'networkidle',timeout:60_000});
await phone.getByRole('link',{name:/Create a cultural session/i}).waitFor({state:'visible',timeout:20_000});
await verifyBrand(phone,'iphone-390');
await phone.screenshot({path:`${out}/00-brand-iphone.png`,fullPage:false});
await phone.close();

// Read-only study-path visual acceptance. Never submit synthetic responses to
// the public study endpoint or count screenshot automation as a participant.
for (const {width,height,name} of [
  {width:1440,height:1000,name:'desktop'},
  {width:390,height:844,name:'iphone'},
]) {
  const studyPage=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await studyPage.goto(url+'/study',{waitUntil:'networkidle',timeout:60_000});
  await studyPage.getByRole('heading',{name:/Could cultural intelligence make activity planning easier/i}).waitFor({state:'visible',timeout:15_000});
  const measure=await studyPage.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    logoLoaded:Array.from(document.querySelectorAll('img')).some(x=>x.src.includes('10b9d53a')&&x.complete&&x.naturalWidth>0),
    hasBaseline:document.body.textContent?.includes('Plan it without Resonance.'),
    hasLiveTask:document.body.textContent?.includes('Do the same task with Resonance.'),
    hasConsent:document.body.textContent?.includes('I consent to anonymous aggregate use'),
    hasReceipt:document.body.textContent?.includes('Create anonymous study receipt'),
  }));
  if(measure.scroll>measure.viewport+2||!measure.logoLoaded||!measure.hasBaseline||!measure.hasLiveTask||!measure.hasConsent||!measure.hasReceipt)
    throw new Error('Study '+name+' acceptance failed: '+JSON.stringify(measure));
  console.log('Resonance study QA '+name+': '+JSON.stringify(measure));
  await studyPage.screenshot({path:`${out}/04-study-${name}.png`,fullPage:false});
  await studyPage.close();
}

await page.locator('#preference-status-0').selectOption('declined');
if(await page.getByRole('button',{name:'Build with live Qloo'}).isEnabled())throw Error('Declined favorite did not block the live agent');
await page.locator('#preference-status-0').selectOption('uncertain');
await page.getByRole('button',{name:'Build with live Qloo'}).click();
await page.getByText('How Qloo changed this session').waitFor({state:'visible',timeout:60_000});
const qlooSection = page.getByText('How Qloo changed this session').locator('xpath=ancestor::section[1]');
await qlooSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const journeySection = page.getByText('Your favorites',{exact:true}).locator('xpath=ancestor::section[1]');
const [journeyBox,qlooBox] = await Promise.all([journeySection.boundingBox(),qlooSection.boundingBox()]);
if (!journeyBox || !qlooBox) throw new Error('Could not locate Qloo transformation evidence');
const x = Math.min(journeyBox.x,qlooBox.x);
const y = Math.min(journeyBox.y,qlooBox.y);
const right = Math.max(journeyBox.x+journeyBox.width,qlooBox.x+qlooBox.width);
const bottom = Math.max(journeyBox.y+journeyBox.height,qlooBox.y+qlooBox.height);
await page.screenshot({path:`${out}/02-qloo-transformation.png`,clip:{x,y,width:right-x,height:bottom-y}});

const sessionSection = page.getByText('A facilitator-ready starting point').locator('xpath=ancestor::section[1]');
await sessionSection.scrollIntoViewIfNeeded();
await sessionSection.getByRole('button',{name:'Keep'}).nth(0).click();
await sessionSection.getByRole('button',{name:'Modify'}).nth(1).click();
await sessionSection.getByRole('button',{name:'Save modification'}).click();
await sessionSection.getByRole('button',{name:'Replace'}).nth(2).click();
await sessionSection.getByRole('button',{name:'Keep'}).nth(3).click();
await page.getByText('All activity decisions complete').waitFor({state:'visible'});
await page.waitForTimeout(300);
await sessionSection.screenshot({path:`${out}/03-finished-session.png`});
const downloadStarted=page.waitForEvent('download',{timeout:15000});
await page.getByRole('button',{name:'Download .txt'}).click();
const download=await downloadStarted;
if(await download.failure()) throw new Error('Session text download failed.');
if(download.suggestedFilename()!=='resonance-session.txt') throw new Error('Unexpected session text filename.');
console.log('Text file download verified.');

await page.getByRole('button',{name:'Save on this device'}).click();
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('resonance.localSavedPlans.v1')||'[]'));
if(!Array.isArray(saved)||!saved.length||!saved[0].text.includes('Resonance session'))
  throw new Error('Local saved-plan export failed.');
console.log('Local saved-plan storage verified.');

const clipboardSimulated=await page.evaluate(()=>{
  try {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied for test');}}});
    return true;
  } catch {return false;}
});
if(clipboardSimulated){
  await page.getByRole('button',{name:'Copy session'}).click();
  await page.locator('#saved-plan-text').waitFor({state:'visible',timeout:10000});
  const manual=await page.locator('#saved-plan-text').inputValue();
  if(!manual.includes('Resonance session'))throw new Error('Manual-copy recovery lacks session text.');
  console.log('Denied-clipboard fallback verified.');
}else{
  console.log('Clipboard-denial injection unsupported in this browser; manual fallback remains unverified here.');
}


// Synthetic facilitator-persona workflow acceptance; DO NOT submit /study data.
const studioButton=page.getByRole('button',{name:'Open facilitator adaptations'});
await studioButton.click();
const studio=page.locator('section[aria-label="Facilitator Studio"]');
await studio.getByText('Step 1 — choose duration, access and language').waitFor({state:'visible'});
await studio.getByLabel('Adapted length').selectOption('5');
await studio.getByRole('checkbox',{name:/I will ask before starting/}).check();
if(!(await studio.getByRole('button',{name:'Start / resume'}).isEnabled()))throw Error('Consent check did not enable facilitator pacing');
await studio.getByRole('button',{name:'Pass / switch topic'}).first().click();
await studio.getByText(/Topic changed at facilitator request/).waitFor({state:'visible'});
await studio.getByLabel('Facilitator cue language').selectOption('es');
await studio.getByText(/¿Prefiere/).first().waitFor({state:'visible'});
const htmlDownload=page.waitForEvent('download',{timeout:15000});
await studio.getByRole('button',{name:'Download complete offline plan'}).click();
const htmlFile=await htmlDownload;
if(await htmlFile.failure()||htmlFile.suggestedFilename()!=='resonance-offline-plan.html')throw Error('Offline HTML download failed');
const cardDownload=page.waitForEvent('download',{timeout:15000});
await studio.getByRole('button',{name:'One-page run sheet / PDF-ready'}).click();
const cardFile=await cardDownload;
if(await cardFile.failure()||cardFile.suggestedFilename()!=='resonance-one-page-run-sheet.html')throw Error('One-page run sheet download failed');
const jsonDownload=page.waitForEvent('download',{timeout:15000});
await studio.getByRole('button',{name:'Download versioned JSON'}).click();
const jsonFile=await jsonDownload;
const jsonPath=await jsonFile.path();
if(!jsonPath)throw Error('Versioned handoff download missing');
const importedJson=JSON.parse(await (await import('node:fs/promises')).readFile(jsonPath,'utf8'));
if(importedJson.schema!=='resonance-facilitator-handoff-v1'||importedJson.sessionMinutes!==5||
   importedJson.steps?.length!==1||importedJson.steps?.[0]?.durationMinutes!==5)
   throw Error('Versioned handoff did not preserve 5-minute adaptation and source');
console.log('Facilitator Studio: consent, declined favorite, topic switch, Spanish draft, 5-minute plan and three offline export formats passed.');
await page.setViewportSize({width:390,height:844});
const width=await page.evaluate(()=>({view:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
if(width.scroll>width.view+2)throw Error('Studio mobile overflow: '+JSON.stringify(width));
await studio.screenshot({path:`${out}/05-facilitator-studio-iphone.png`,animations:'disabled'});
console.log('Facilitator Studio mobile layout passed:',JSON.stringify(width));
await browser.close();
console.log('Captured refreshed judge gallery, live plan review, downloadable export, local save and clipboard recovery from',url);
