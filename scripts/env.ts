import { readFileSync } from 'node:fs';

/**
 * Minimal .env.local loader for standalone scripts. Next loads this file
 * automatically; plain `node`/`tsx` does not.
 */
export function loadEnv(file = '.env.local'): void {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`Could not read ${file}. Copy .env.example and fill it in.`);
  }

  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue; // real environment wins
    process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, '$1');
  }
}
