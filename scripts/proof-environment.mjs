const ALLOWED_PARENT_ENV = [
  'PATH',
  'Path',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'TEMP',
  'TMP',
  'TMPDIR',
  'SystemRoot',
  'SYSTEMROOT',
  'ComSpec',
  'COMSPEC',
  'PATHEXT',
  'LANG',
  'LC_ALL',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
];

export function buildQlooProofEnv(parentEnv, qlooApiKey) {
  const env = {};
  for (const name of ALLOWED_PARENT_ENV) {
    const value = parentEnv?.[name];
    if (typeof value === 'string' && value.length) env[name] = value;
  }
  env.QLOO_API_KEY = qlooApiKey;
  return env;
}

export function proofEnvKeys() {
  return [...ALLOWED_PARENT_ENV, 'QLOO_API_KEY'];
}
