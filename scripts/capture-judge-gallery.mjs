import { chromium } from 'playwright-core';
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
await page.getByText('How Qloo changed this session').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({path:`${out}/02-qloo-transformation.png`,fullPage:false});

await page.getByText('A facilitator-ready starting point').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({path:`${out}/03-finished-session.png`,fullPage:false});

await browser.close();
console.log('Captured 3 judge-gallery screenshots from',url);
