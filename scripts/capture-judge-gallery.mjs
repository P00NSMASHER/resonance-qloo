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
    artworkLoaded:Array.from(document.querySelectorAll('img')).some(x=>x.src.includes('559ce4f0')&&x.complete&&x.naturalWidth>0),
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
const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await phone.goto(url,{waitUntil:'networkidle',timeout:60_000});
await phone.getByRole('link',{name:/Create a cultural session/i}).waitFor({state:'visible',timeout:20_000});
await verifyBrand(phone,'iphone-390');
await phone.screenshot({path:`${out}/00-brand-iphone.png`,fullPage:false});
await phone.close();

await page.getByRole('button',{name:'Build with live Qloo'}).click();
await page.getByText('How Qloo changed this session').waitFor({state:'visible',timeout:60_000});
const qlooSection = page.getByText('How Qloo changed this session').locator('xpath=ancestor::section[1]');
await qlooSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const journeySection = page.getByText('Your favorites').locator('xpath=ancestor::section[1]');
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

await browser.close();
console.log('Captured 3 judge-gallery screenshots from',url);
