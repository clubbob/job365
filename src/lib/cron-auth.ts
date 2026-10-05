import { NextResponse } from 'next/server';

export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'CRON_SECRET이 설정되지 않았습니다.' } },
      { status: 503 },
    );
  }

  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerSecret = request.headers.get('x-cron-secret');
  const provided = auth || headerSecret;

  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  return null;
}
