import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const receipt=JSON.parse(await readFile(new URL('../BUILD_RECEIPT.json',import.meta.url),'utf8'));
const manifestBytes=await readFile(new URL('../floot-production/manifest.json',import.meta.url));
const manifest=JSON.parse(manifestBytes);
const contract=JSON.parse(await readFile(new URL('../deployment-contract.json',import.meta.url),'utf8'));
const sha256=createHash('sha256').update(manifestBytes).digest('hex');
const failures=[];
if(!/^[0-9a-f]{40}$/.test(receipt.sourceCommit)) failures.push('invalid source commit');
if(receipt.flootProjectId!==manifest.flootProjectId) failures.push('project ID mismatch');
if(receipt.flootProjectVersion!==manifest.flootProjectVersion) failures.push('Floot version mismatch');
if(receipt.productionManifestSha256!==sha256) failures.push('manifest hash mismatch');
if(receipt.deploymentContractVersion!==contract.version) failures.push('deployment contract mismatch');
if(!/^https:\/\/github\.com\/P00NSMASHER\/resonance-qloo\/actions\/runs\/\d+$/.test(receipt.galleryWorkflowRun)||receipt.galleryWorkflowConclusion!=='success') failures.push('gallery workflow receipt invalid');
if(!Number.isFinite(Date.parse(receipt.builtAt))) failures.push('build timestamp invalid');
if(!process.argv.includes('--offline')) {
  const response=await fetch(`${receipt.publicUrl}/_api/status`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15_000)});
  const body=await response.text();
  if(!response.ok||!body.includes(receipt.deploymentContractVersion)||!body.includes('ready')) failures.push('live deployment does not match receipt contract/readiness');
}
if(failures.length){failures.forEach(x=>console.error('FAIL:',x));process.exit(1)}
console.log(`Build receipt verified: source ${receipt.sourceCommit}; Floot ${receipt.flootProjectVersion}; gallery workflow succeeded.`);
