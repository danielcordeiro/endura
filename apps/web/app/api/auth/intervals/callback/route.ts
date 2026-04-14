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
    return `https://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = getBaseUrl(request);

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&error=missing_params`);
  }

  try {
    const response = await fetch(
      `${API_URL}/api/integrations/intervals/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
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

    const res = NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&success=true`);

    res.cookies.set('token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    res.cookies.set('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integration=intervals&error=network`);
  }
}
