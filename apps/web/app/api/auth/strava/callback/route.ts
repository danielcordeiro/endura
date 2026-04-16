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

  console.log('[strava-callback] apiUrl:', apiUrl, 'baseUrl:', baseUrl);

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=missing_params`);
  }

  try {
    const fetchUrl = `${apiUrl}/api/integrations/strava/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    console.log('[strava-callback] Fetching:', fetchUrl);

    const response = await fetch(fetchUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[strava-callback] API error:', response.status, errorText);
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
    console.error('[strava-callback] Network error:', err instanceof Error ? err.message : err);
    console.error('[strava-callback] API_URL was:', apiUrl);
    return NextResponse.redirect(`${baseUrl}/login?strava=error&reason=network`);
  }
}
