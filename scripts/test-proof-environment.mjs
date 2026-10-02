import { buildQlooProofEnv, proofEnvKeys } from './proof-environment.mjs';

const parent = {
  PATH:'/usr/bin',
  HOME:'/home/test',
  LANG:'en_US.UTF-8',
  QLOO_API_KEY:'parent-key-should-not-win',
  OPENAI_API_KEY:'unrelated-openai-secret',
  GITHUB_TOKEN:'unrelated-github-secret',
  AWS_SECRET_ACCESS_KEY:'unrelated-aws-secret',
  DATABASE_URL:'postgres://secret',
  QLOO_API_BASE_URL:'https://evil.example',
};

const env = buildQlooProofEnv(parent, 'event-qloo-key');

if (env.QLOO_API_KEY !== 'event-qloo-key') throw new Error('Explicit event key was not preserved.');
if (env.PATH !== '/usr/bin' || env.HOME !== '/home/test' || env.LANG !== 'en_US.UTF-8') {
  throw new Error('Required runtime environment variables were not preserved.');
}
for (const forbidden of ['OPENAI_API_KEY','GITHUB_TOKEN','AWS_SECRET_ACCESS_KEY','DATABASE_URL','QLOO_API_BASE_URL']) {
  if (forbidden in env) throw new Error(`Proof subprocess leaked unrelated variable: ${forbidden}`);
}
const allowed = new Set(proofEnvKeys());
for (const key of Object.keys(env)) {
  if (!allowed.has(key)) throw new Error(`Unexpected proof subprocess environment key: ${key}`);
}

console.log('Proof environment isolation self-test passed.');
