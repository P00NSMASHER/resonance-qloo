const QLOO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function qlooEntityIdentity(value: string) {
  const trimmed = value.trim();
  return QLOO_UUID.test(trimmed) ? trimmed.toLocaleLowerCase('en-US') : trimmed;
}
