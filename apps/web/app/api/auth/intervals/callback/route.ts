import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/configuracoes?integration=intervals&error=missing_params', request.url),
    );
  }

  try {
    const response = await fetch(
      `${API_URL}/api/integrations/intervals/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'ERR_UNKNOWN' }));
      return NextResponse.redirect(
        new URL(`/configuracoes?integration=intervals&error=${error.code ?? 'exchange_failed'}`, request.url),
      );
    }

    const { data } = await response.json() as {
      data: { token: string; refreshToken: string; provider: string };
    };

    const redirectUrl = new URL('/configuracoes?integration=intervals&success=true', request.url);
    const res = NextResponse.redirect(redirectUrl);

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
    return NextResponse.redirect(
      new URL('/configuracoes?integration=intervals&error=network', request.url),
    );
  }
}
