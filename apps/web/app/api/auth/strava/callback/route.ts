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

async function fetchWithWakeUp(url: string, retries: number = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') ?? '';

    // If we got JSON back, the API is awake — return the response
    if (contentType.includes('application/json')) {
      return res;
    }

    // If HTML response (Render "waking up" page), wait and retry
    console.log(`[strava-callback] API returned HTML (attempt ${i + 1}/${retries}), waiting for wake-up...`);
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 3000)); // Wait 3s for API to wake up
    }
  }

  throw new Error('API did not wake up after retries — returned HTML instead of JSON');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = getBaseUrl(request);
  const apiUrl = getServerApiUrl();

  console.log('[strava-callback] apiUrl:', apiUrl, 'baseUrl:', baseUrl);

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=missing_params`);
  }

  try {
    const fetchUrl = `${apiUrl}/api/integrations/strava/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    console.log('[strava-callback] Fetching:', fetchUrl);

    const response = await fetchWithWakeUp(fetchUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[strava-callback] API error:', response.status, errorBody.substring(0, 200));
      return NextResponse.redirect(
        `${baseUrl}/login?strava=error&reason=api_${response.status}`,
      );
    }

    const { data } = await response.json() as {
      data: { token: string; refreshToken: string; provider: string };
    };

    console.log('[strava-callback] Success, redirecting with token');
    const fragment = `token=${encodeURIComponent(data.token)}`;
    return NextResponse.redirect(`${baseUrl}/login?strava=callback#${fragment}`);
  } catch (err) {
    console.error('[strava-callback] Error:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=network`);
  }
}
