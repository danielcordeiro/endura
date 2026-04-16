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
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&error=missing_params`);
  }

  try {
    const response = await fetch(
      `${apiUrl}/api/integrations/intervals/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'ERR_UNKNOWN' }));
      return NextResponse.redirect(
        `${baseUrl}/configuracoes?integration=intervals&error=${error.code ?? 'exchange_failed'}`,
      );
    }

    const { data } = await response.json() as {
      data: { token: string; refreshToken: string; provider: string };
    };

    const fragment = `token=${encodeURIComponent(data.token)}`;
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&success=true#${fragment}`);
  } catch (err) {
    console.error('[intervals-callback] Network error:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&error=network`);
  }
}
