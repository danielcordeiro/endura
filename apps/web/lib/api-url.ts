/**
 * Returns the API URL for server-side Route Handlers.
 * Checks multiple sources to ensure it works in all environments:
 * 1. NEXT_PUBLIC_API_URL (build-time + runtime)
 * 2. API_URL (runtime only, server-side)
 * 3. Fallback to localhost for development
 */
export function getServerApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    'http://localhost:8080'
  );
}
