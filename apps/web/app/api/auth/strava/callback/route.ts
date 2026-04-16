import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:8080';

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

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=strava&error=missing_params`);
  }

  try {
    const response = await fetch(
      `${API_URL}/api/integrations/strava/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'ERR_UNKNOWN' }));
      return NextResponse.redirect(
        `${baseUrl}/configuracoes?integration=strava&error=${error.code ?? 'exchange_failed'}`,
      );
    }

    const { data } = await response.json() as {
      data: { token: string; refreshToken: string; provider: string };
    };

    // Pass tokens via URL fragment (#) so the client can save to Zustand store
    // Fragment is not sent to server, only visible to the browser
    // Redirect to /login (not /configuracoes) because AuthGuard would block unauthenticated users
    const fragment = `token=${encodeURIComponent(data.token)}`;
    return NextResponse.redirect(
      `${baseUrl}/login?strava=callback#${fragment}`,
    );
  } catch (err) {
    console.error('[strava-callback] Error:', err);
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=strava&error=network`);
  }
}
