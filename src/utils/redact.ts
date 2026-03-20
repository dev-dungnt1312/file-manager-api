const SECRET_KEYS = [
  'password',
  'secretAccessKey',
  'accessKeyId',
  'apiToken',
  'secret',
  'token',
];

function maskValue(value: unknown) {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function redactSecrets<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item)) as T;
  }

  if (input && typeof input === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SECRET_KEYS.includes(key)) {
        output[key] = maskValue(value);
      } else {
        output[key] = redactSecrets(value);
      }
    }
    return output as T;
  }

  return input;
}
