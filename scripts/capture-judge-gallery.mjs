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
