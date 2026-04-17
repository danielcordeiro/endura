import { NextRequest, NextResponse } from 'next/server';
import { getServerApiUrl } from '@/lib/api-url';

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = request.headers.get('host');
  if (host && !host.includes('localhost:10000')) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = getBaseUrl(request);
  const apiUrl = getServerApiUrl();

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=missing_params`);
  }

  const fetchUrl = `${apiUrl}/api/integrations/strava/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  console.log('[strava-callback] Fetching:', fetchUrl);

  // Try up to 3 times. The API has a code-cache that prevents double-consumption.
  // So if the first attempt times out but actually exchanged the code with Strava,
  // the retry will return the cached JWT instead of re-exchanging.
  let lastError: string = 'unknown';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(fetchUrl, {
        signal: AbortSignal.timeout(60000), // 60s timeout for wake-up
      });
      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        console.log(`[strava-callback] Attempt ${attempt}: API returned non-JSON, retrying...`);
        lastError = 'api_not_ready';
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[strava-callback] Attempt ${attempt}: API error ${response.status}: ${errorBody.substring(0, 300)}`);
        return NextResponse.redirect(
          `${baseUrl}/login?strava=error&reason=api_${response.status}`,
        );
      }

      const { data } = await response.json() as {
        data: { token: string; refreshToken: string; provider: string };
      };

      console.log('[strava-callback] Success!');
      const fragment = `token=${encodeURIComponent(data.token)}`;
      return NextResponse.redirect(`${baseUrl}/login?strava=callback#${fragment}`);
    } catch (err) {
      console.error(`[strava-callback] Attempt ${attempt} error:`, err instanceof Error ? err.message : err);
      lastError = 'network';
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=${lastError}`);
}
