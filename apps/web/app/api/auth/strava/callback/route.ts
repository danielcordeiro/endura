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

  try {
    // Wake up API first if needed (hit health endpoint)
    const healthRes = await fetch(`${apiUrl}/health`).catch(() => null);
    const healthType = healthRes?.headers.get('content-type') ?? '';
    if (!healthType.includes('application/json')) {
      // API is waking up — wait for it
      console.log('[strava-callback] API waking up, waiting 5s...');
      await new Promise((r) => setTimeout(r, 5000));
      // Try health again
      await fetch(`${apiUrl}/health`).catch(() => null);
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Now call the actual callback — single attempt only (code is single-use)
    const fetchUrl = `${apiUrl}/api/integrations/strava/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    console.log('[strava-callback] Fetching:', fetchUrl);

    const response = await fetch(fetchUrl);
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      console.error('[strava-callback] API returned HTML — still waking up');
      return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=api_unavailable`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[strava-callback] API error:', response.status, errorBody.substring(0, 200));
      return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=api_${response.status}`);
    }

    const { data } = await response.json() as {
      data: { token: string; refreshToken: string; provider: string };
    };

    console.log('[strava-callback] Success!');
    const fragment = `token=${encodeURIComponent(data.token)}`;
    return NextResponse.redirect(`${baseUrl}/login?strava=callback#${fragment}`);
  } catch (err) {
    console.error('[strava-callback] Error:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=network`);
  }
}
