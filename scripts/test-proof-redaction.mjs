import { assertSecretAbsent, redactProof } from './proof-redaction.mjs';

const secret = 'qloo-test-secret-value';
const input = {
  token:'different-token',
  ordinaryField:`prefix-${secret}-suffix`,
  nested:{
    harmless:'ok',
    credential:'should-hide',
    list:[
      { value:secret },
      { api_key:'also-hide' },
    ],
  },
  results:[
    { title:'one', metadata:{ note:secret } },
    { title:'two' },
    { title:'three' },
    { title:'four' },
    { title:'five' },
    { title:'six-should-be-truncated' },
  ],
};

const redacted = redactProof(input, secret);
const serialized = JSON.stringify(redacted);

if (serialized.includes(secret)) {
  throw new Error('Secret value survived redaction under a benign field.');
}
if (redacted.token !== '[REDACTED]') {
  throw new Error('Sensitive token field was not redacted.');
}
if (redacted.nested?.credential !== '[REDACTED]') {
  throw new Error('Sensitive credential field was not redacted.');
}
if (redacted.results?.length !== 5) {
  throw new Error('Proof result bounding changed unexpectedly.');
}
if (!String(redacted.ordinaryField).includes('[REDACTED]')) {
  throw new Error('Secret substring under ordinary field was not redacted.');
}

assertSecretAbsent(serialized, secret);

let guardTriggered = false;
try {
  assertSecretAbsent(JSON.stringify({ ordinaryField:secret }), secret);
} catch {
  guardTriggered = true;
}
if (!guardTriggered) {
  throw new Error('Final serialized secret guard did not reject a leaked API key.');
}

console.log('Proof redaction self-test passed.');
