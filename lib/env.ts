/**
 * Environment access that is safe to evaluate at build time.
 *
 * `next build` imports every route module, so anything that throws at module
 * scope makes the build require production secrets. That breaks CI and makes a
 * missing variable surface as an opaque build failure rather than a clear runtime
 * error. These read lazily and fail at the point of use, with a message naming
 * the variable and how to set it.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in ` +
        `(see README "Configuration").`
    );
  }
  return value;
}

/** Empty string at build time; the real check happens in requireEnv at request time. */
export function envOrEmpty(name: string): string {
  return process.env[name] ?? '';
}

export const isConfigured = (...names: string[]) => names.every((n) => Boolean(process.env[n]));
